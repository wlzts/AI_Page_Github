package com.example.tradesummary

import android.webkit.WebView
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class WebAutomation(
    private val webView: WebView,
    private val log: (String) -> Unit
) {

    companion object {
        const val DASHBOARD_URL =
            "https://xbackstage.ceramic-copyright.com/admin_o/#/dashboard"

        const val SUMMARY_ROUTE =
            "#/zyq-transaction-monitoring/zyq-summary-of-user-transactions-hNew"
    }

    suspend fun loadDashboard() {
        log("正在打开后台……")
        webView.loadUrl(DASHBOARD_URL)

        val deadline = System.currentTimeMillis() + 30_000
        while (System.currentTimeMillis() < deadline) {
            val ready = evalBoolean(
                """document.readyState === "complete" || document.readyState === "interactive";"""
            )
            if (ready) {
                delay(1200)
                applyTabletDesktopLayout()
                return
            }
            delay(250)
        }
        error("后台网页加载超时。")
    }

    suspend fun isBackendReady(): Boolean {
        return evalBoolean(
            """
            (() => {
                const t = (document.body?.innerText || "");
                return [
                    "账号管理设置",
                    "资金管理设置",
                    "订单设置管理",
                    "订单交收管理",
                    "订单数据查询",
                    "商城管理"
                ].some(x => t.includes(x));
            })();
            """.trimIndent()
        )
    }

    suspend fun fillLoginForm(username: String, password: String) {
        val u = JSONObject.quote(username)
        val p = JSONObject.quote(password)

        val result = evalString(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const inputs = [...document.querySelectorAll("input")].filter(visible);

                const user =
                    inputs.find(x => (x.placeholder || "").includes("账号")) ||
                    inputs.find(x => (x.name || "").toLowerCase().includes("user")) ||
                    inputs.find(x => x.type === "text");

                const pass =
                    inputs.find(x => (x.placeholder || "").includes("密码")) ||
                    inputs.find(x => x.type === "password");

                const captcha =
                    inputs.find(x => (x.placeholder || "").includes("验证码")) ||
                    inputs.find(x => (x.name || "").toLowerCase().includes("captcha")) ||
                    inputs.find(x => (x.name || "").toLowerCase().includes("code"));

                function setValue(el, value) {
                    if (!el) return;
                    const setter =
                        Object.getOwnPropertyDescriptor(
                            HTMLInputElement.prototype, "value"
                        )?.set;
                    setter?.call(el, value);
                    el.dispatchEvent(new Event("input", {bubbles: true}));
                    el.dispatchEvent(new Event("change", {bubbles: true}));
                }

                if (!user || !pass) return "missing";

                setValue(user, $u);
                setValue(pass, $p);

                if (captcha) {
                    captcha.click();
                    captcha.focus();
                    return "ok_focus";
                }

                return "ok_no_captcha";
            })();
            """.trimIndent()
        )

        when (result) {
            "missing" -> error("没有找到账号或密码输入框。")
            "ok_no_captcha" ->
                log("账号密码已填写，但没有自动找到验证码输入框，请手动点击。")
            else ->
                log("账号密码已填写，光标已定位到验证码输入框。")
        }
    }

    suspend fun waitForBackendReady(timeoutMs: Long = 120_000): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {
            if (isBackendReady()) return true
            delay(500)
        }

        return isBackendReady()
    }

    suspend fun runQueries(
        centers: List<String>,
        startDate: String,
        endDate: String
    ): List<SummaryRecord> {
        openSummaryHistory()

        val records = mutableListOf<SummaryRecord>()

        for (center in centers) {
            log("开始查询运营中心 $center……")

            clickResetIfVisible()
            setOperatingCenter(center)
            selectDate("start", startDate)
            selectDate("end", endDate)

            val previousTotal = getCurrentTotalText()
            clickSearch()

            log("等待 $center 查询结果刷新……")
            waitForQueryRefresh(center, previousTotal)

            val extracted = extractTotal()
            val metrics = cleanMetrics(
                extracted.first,
                extracted.second
            )

            if (metrics.isEmpty()) {
                error("运营中心 $center 的“合计”行没有读取到有效指标。")
            }

            records += SummaryRecord(
                centerCode = center,
                startDate = startDate,
                endDate = endDate,
                metrics = metrics
            )

            log("✓ $center 查询完成")
            delay(800)
        }

        return records
    }

    suspend fun applyTabletDesktopLayout() {
        evalBoolean(
            """
            (() => {
                let meta = document.querySelector('meta[name="viewport"]');

                if (!meta) {
                    meta = document.createElement("meta");
                    meta.name = "viewport";
                    document.head?.appendChild(meta);
                }

                meta.setAttribute(
                    "content",
                    "width=1200, initial-scale=1.0, minimum-scale=0.5, maximum-scale=4.0, user-scalable=yes"
                );

                if (document.documentElement) {
                    document.documentElement.style.minWidth = "1100px";
                }

                if (document.body) {
                    document.body.style.minWidth = "1100px";
                }

                return true;
            })();
            """.trimIndent()
        )
    }

    suspend fun openSidebarForUser() {
        applyTabletDesktopLayout()

        if (isTextVisibleContains("订单数据查询")) {
            log("左侧菜单已经展开。")
            return
        }

        log("正在尝试展开左侧菜单……")

        repeat(4) {
            val result = evalString(
                """
                (() => {
                    const visible = el => !!el &&
                        !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                    const selectors = [
                        ".hamburger-container",
                        ".hamburger",
                        "[class*='hamburger']",
                        ".el-icon-s-unfold",
                        ".el-icon-menu",
                        "[class*='sidebar-toggle']",
                        "[class*='menu-toggle']",
                        "[class*='menu-fold']",
                        "[title*='展开']",
                        "[aria-label*='菜单']",
                        "[aria-label*='menu']"
                    ];

                    for (const selector of selectors) {
                        let list = [];

                        try {
                            list = [...document.querySelectorAll(selector)];
                        } catch (_) {
                            continue;
                        }

                        const target = list.find(visible);

                        if (target) {
                            (target.closest("button") || target).click();
                            return "clicked";
                        }
                    }

                    // 常见 Vue Admin：菜单处于 collapse 状态时，尝试点击页面左上角附近的可点击图标。
                    const collapsed = document.querySelector(".el-menu--collapse");

                    if (collapsed) {
                        const clickable = [
                            ...document.querySelectorAll("button,i,svg,span,div")
                        ].filter(visible).find(el => {
                            const r = el.getBoundingClientRect();
                            const cls = String(el.className || "");
                            return r.left >= 0 &&
                                r.left < 140 &&
                                r.top >= 0 &&
                                r.top < 120 &&
                                (
                                    cls.includes("hamburger") ||
                                    cls.includes("menu") ||
                                    cls.includes("fold") ||
                                    cls.includes("unfold")
                                );
                        });

                        if (clickable) {
                            (clickable.closest("button") || clickable).click();
                            return "clicked_top_left";
                        }
                    }

                    return "not_found";
                })();
                """.trimIndent()
            )

            delay(650)

            if (isTextVisibleContains("订单数据查询")) {
                log("✓ 左侧菜单已展开")
                return
            }

            if (result.startsWith("clicked")) {
                delay(350)
            }
        }

        // 最后回退：把常见 sidebar 容器强制显示出来。
        val forced = evalBoolean(
            """
            (() => {
                const candidates = [
                    ".sidebar-container",
                    ".aside-container",
                    ".el-aside",
                    "[class*='sidebar']"
                ];

                let sidebar = null;

                for (const selector of candidates) {
                    try {
                        sidebar = [...document.querySelectorAll(selector)]
                            .find(el => {
                                const text = el.innerText || "";
                                return text.includes("订单") || text.includes("首页");
                            });

                        if (sidebar) break;
                    } catch (_) {
                    }
                }

                if (!sidebar) return false;

                sidebar.style.display = "block";
                sidebar.style.visibility = "visible";
                sidebar.style.transform = "translateX(0)";
                sidebar.style.opacity = "1";
                sidebar.style.width = "210px";
                sidebar.style.minWidth = "210px";
                sidebar.style.zIndex = "9999";

                const menu = sidebar.querySelector(".el-menu");
                if (menu) {
                    menu.classList.remove("el-menu--collapse");
                    menu.style.width = "210px";
                }

                return true;
            })();
            """.trimIndent()
        )

        delay(600)

        if (forced && isTextVisibleContains("订单数据查询")) {
            log("✓ 已强制显示左侧菜单")
        } else {
            log("未能完整展开侧边栏；自动查询时会使用目标页面直达作为备用方案。")
        }
    }

    private suspend fun openSummaryHistory() {
        applyTabletDesktopLayout()
        openSidebarForUser()
        delay(500)

        var menuSuccess = false

        try {
            if (!isTextVisible("交易商查询")) {
                log("正在展开：订单数据查询")
                clickTextContains("订单数据查询")
                delay(800)
            }

            if (!isTextVisible("用户成交汇总历史")) {
                log("正在展开：交易商查询")
                clickTextExact("交易商查询")
                delay(800)
            }

            if (isTextVisible("用户成交汇总历史")) {
                log("正在打开：用户成交汇总历史")
                clickTextExact("用户成交汇总历史")
                delay(1600)
                menuSuccess = true
            }
        } catch (e: Exception) {
            log("侧边菜单点击未完成：${e.message}")
        }

        if (!menuSuccess || !isSummaryPageReady()) {
            log("正在使用备用方式直接进入“用户成交汇总历史”……")
            val route = JSONObject.quote(SUMMARY_ROUTE)

            evalBoolean(
                """
                (() => {
                    location.hash = $route;
                    return true;
                })();
                """.trimIndent()
            )

            delay(1800)
        }

        val deadline = System.currentTimeMillis() + 15_000

        while (System.currentTimeMillis() < deadline) {
            if (isSummaryPageReady()) {
                log("✓ 已进入用户成交汇总历史")
                return
            }
            delay(500)
        }

        error("无法进入“用户成交汇总历史”查询页面。")
    }

    private suspend fun isSummaryPageReady(): Boolean {
        return evalBoolean(
            """
            (() => {
                const hashOk =
                    (location.hash || "").includes("zyq-summary-of-user-transactions-hNew");

                const inputs = [...document.querySelectorAll("input")];
                const centerInput = inputs.some(x =>
                    (x.placeholder || "").includes("运营中心")
                );

                return hashOk || centerInput;
            })();
            """.trimIndent()
        )
    }

    private suspend fun isTextVisibleContains(text: String): Boolean {
        val q = JSONObject.quote(text)

        return evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                return [...document.querySelectorAll("body *")]
                    .some(el =>
                        visible(el) &&
                        (el.innerText || "").includes($q)
                    );
            })();
            """.trimIndent()
        )
    }

    private suspend fun isTextVisible(text: String): Boolean {
        val q = JSONObject.quote(text)
        return evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
                return [...document.querySelectorAll("body *")]
                    .some(el => visible(el) && (el.innerText || "").trim() === $q);
            })();
            """.trimIndent()
        )
    }

    private suspend fun clickTextExact(text: String) {
        clickText(text, exact = true)
    }

    private suspend fun clickTextContains(text: String) {
        clickText(text, exact = false)
    }

    private suspend fun clickText(text: String, exact: Boolean) {
        val q = JSONObject.quote(text)
        val exactJs = if (exact) "t === $q" else "t.includes($q)"

        val ok = evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const candidates = [
                    ...document.querySelectorAll(
                        ".el-submenu__title,.el-menu-item,button,.el-button"
                    )
                ].filter(visible);

                let el = candidates.find(x => {
                    const t = (x.innerText || "").trim();
                    return $exactJs;
                });

                if (!el) {
                    el = [...document.querySelectorAll("body *")]
                        .filter(visible)
                        .find(x => {
                            const t = (x.innerText || "").trim();
                            return $exactJs;
                        });
                }

                if (!el) return false;

                const target =
                    el.closest(".el-submenu__title,.el-menu-item,button,.el-button") || el;

                target.scrollIntoView({block: "center"});
                target.click();
                return true;
            })();
            """.trimIndent()
        )

        if (!ok) error("找不到可点击文字：$text")
    }

    private suspend fun clickResetIfVisible() {
        evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const el = [...document.querySelectorAll("button,.el-button")]
                    .filter(visible)
                    .find(x => (x.innerText || "").trim() === "重置");

                if (!el) return false;
                el.click();
                return true;
            })();
            """.trimIndent()
        )
        delay(500)
    }

    private suspend fun setOperatingCenter(value: String) {
        val q = JSONObject.quote(value)

        val actual = evalString(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const inputs = [...document.querySelectorAll("input")].filter(visible);

                const field =
                    inputs.find(x => (x.placeholder || "").includes("运营中心编码")) ||
                    inputs.find(x => (x.getAttribute("aria-label") || "").includes("运营中心编码")) ||
                    inputs.find(x => (x.placeholder || "").includes("运营中心"));

                if (!field) return "__MISSING__";

                const setter =
                    Object.getOwnPropertyDescriptor(
                        HTMLInputElement.prototype, "value"
                    )?.set;

                field.click();
                setter?.call(field, $q);
                field.dispatchEvent(new Event("input", {bubbles: true}));
                field.dispatchEvent(new Event("change", {bubbles: true}));
                field.dispatchEvent(new Event("blur", {bubbles: true}));

                return field.value || "";
            })();
            """.trimIndent()
        )

        if (actual == "__MISSING__") {
            error("找不到“运营中心编码”输入框。")
        }

        if (actual.trim() != value) {
            error("运营中心编码填写失败：期望 $value，实际 $actual")
        }

        log("运营中心编码已填写：$value")
        delay(250)
    }

    private suspend fun selectDate(kind: String, dateText: String) {
        val label = if (kind == "start") "开始" else "结束"
        val parts = dateText.split("-")

        require(parts.size == 3) {
            "日期格式错误：$dateText"
        }

        val targetYear = parts[0].toInt()
        val targetMonth = parts[1].toInt()
        val targetDay = parts[2].toInt()

        log("正在选择${label}日期：$dateText")

        // V6：完全按照人工操作日期框的逻辑执行。
        // 1. 确保没有上一次残留的日期窗口。
        // 2. 点击本次日期输入框打开 Element UI 日期面板。
        // 3. 切换到目标年月。
        // 4. 真正点击目标日期单元格。
        // 5. 等待网页自己赋值并自动关闭日期窗口。
        // 不再直接修改 readonly input，也绝不再给 picker 写 display:none。
        closeOpenDatePickerSafely()

        openDatePicker(kind)
        navigateActivePickerToMonth(targetYear, targetMonth)

        val clicked = clickDateInActivePicker(targetDay)

        if (!clicked) {
            error("日期面板中找不到可点击的 $targetDay 日。")
        }

        // Element UI 正常逻辑：点中日期 -> emit pick -> 输入框赋值 -> picker 自动关闭。
        val selected = waitForDateSelectedAndClosed(
            kind = kind,
            expectedDate = dateText,
            timeoutMs = 3500
        )

        if (!selected) {
            val actual = readDateFieldValue(kind)

            // 如果值已经正确、只是 WebView 的关闭动画/ClickOutside 没执行，
            // 只调用组件自身的关闭逻辑，不做 CSS 强制隐藏。
            if (sameDateValue(actual, dateText)) {
                log("${label}日期已选中，正在关闭日期窗口……")
                closeOpenDatePickerSafely()

                if (!waitUntilNoDatePicker(1800)) {
                    error("${label}日期值已经正确，但日期窗口没有正常关闭。")
                }
            } else {
                error(
                    "${label}日期选择失败：期望 $dateText，" +
                        "网页当前值为 ${actual.ifBlank { "空" }}。"
                )
            }
        }

        val finalValue = readDateFieldValue(kind)

        if (!sameDateValue(finalValue, dateText)) {
            error(
                "${label}日期最终校验失败：期望 $dateText，" +
                    "实际为 ${finalValue.ifBlank { "空" }}。"
            )
        }

        if (isAnyDatePickerVisible()) {
            closeOpenDatePickerSafely()
        }

        delay(220)
        log("✓ ${label}日期已选中并关闭窗口：$finalValue")
    }

    private suspend fun openDatePicker(kind: String) {
        val keywords =
            if (kind == "start") {
                listOf("开始时间", "开始日期")
            } else {
                listOf("结束时间", "截止时间", "结束日期")
            }

        val keywordsJson = JSONArray(keywords).toString()
        val index = if (kind == "start") 0 else 1

        val clicked = evalBoolean(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        r.width > 0 && r.height > 0;
                };

                const keys = $keywordsJson;
                const inputs = [...document.querySelectorAll("input")].filter(isVisible);

                let field = inputs.find(x => {
                    const p = x.placeholder || "";
                    return keys.some(k => p.includes(k));
                });

                if (!field) {
                    const dateInputs = [
                        ...document.querySelectorAll(".el-date-editor input")
                    ].filter(isVisible);
                    field = dateInputs[$index];
                }

                if (!field) return false;

                field.scrollIntoView({block: "center", inline: "nearest"});

                // 模拟一次真实鼠标/触摸点击，而不是修改 input.value。
                const rect = field.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                const target = document.elementFromPoint(x, y) || field;

                try {
                    if (window.PointerEvent) {
                        target.dispatchEvent(new PointerEvent("pointerdown", {
                            bubbles: true,
                            cancelable: true,
                            pointerType: "touch",
                            isPrimary: true,
                            clientX: x,
                            clientY: y
                        }));
                    }
                } catch (_) {
                }

                target.dispatchEvent(new MouseEvent("mousedown", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                }));

                target.dispatchEvent(new MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                }));

                target.click();
                return true;
            })();
            """.trimIndent()
        )

        if (!clicked) {
            error("找不到${if (kind == "start") "开始" else "结束"}日期输入框。")
        }

        val deadline = System.currentTimeMillis() + 3000

        while (System.currentTimeMillis() < deadline) {
            if (isAnyDatePickerVisible()) {
                delay(120)
                return
            }
            delay(100)
        }

        error("点击日期输入框后，没有检测到日期窗口。")
    }

    private suspend fun navigateActivePickerToMonth(
        targetYear: Int,
        targetMonth: Int
    ) {
        repeat(36) {
            val current = getActivePickerYearMonth()
                ?: error("无法读取当前日期窗口的年月。")

            if (current.first == targetYear && current.second == targetMonth) {
                return
            }

            val currentIndex = current.first * 12 + current.second
            val targetIndex = targetYear * 12 + targetMonth

            val moved = clickActivePickerMonthArrow(
                if (targetIndex < currentIndex) "prev" else "next"
            )

            if (!moved) {
                error("日期窗口月份切换失败。")
            }

            delay(220)
        }

        error("日期窗口无法导航到 $targetYear-${targetMonth.toString().padStart(2, '0')}。")
    }

    private suspend fun getActivePickerYearMonth(): Pair<Int, Int>? {
        val json = evalString(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        Number(style.opacity || 1) > 0 &&
                        r.width > 0 && r.height > 0;
                };

                const panels = [
                    ...document.querySelectorAll(
                        ".el-picker-panel.el-date-picker,.el-date-picker,.el-picker-panel"
                    )
                ].filter(isVisible);

                if (!panels.length) return "";

                // 选最上层、最后插入 DOM 的日期窗口。
                const picker = panels
                    .map((el, index) => ({
                        el,
                        index,
                        z: Number.parseInt(getComputedStyle(el).zIndex || "0", 10) || 0
                    }))
                    .sort((a, b) => (b.z - a.z) || (b.index - a.index))[0].el;

                const labels = [
                    ...picker.querySelectorAll(".el-date-picker__header-label")
                ].map(x => (x.innerText || "").trim()).join(" ");

                const text = labels || (picker.innerText || "");
                const y = text.match(/(\d{4})\s*年/);
                const m = text.match(/(\d{1,2})\s*月/);

                if (!y || !m) return "";

                return JSON.stringify({
                    year: Number(y[1]),
                    month: Number(m[1])
                });
            })();
            """.trimIndent()
        )

        if (json.isBlank()) return null

        val obj = JSONObject(json)
        return obj.getInt("year") to obj.getInt("month")
    }

    private suspend fun clickActivePickerMonthArrow(direction: String): Boolean {
        val selector =
            if (direction == "prev") {
                ".el-date-picker__prev-btn.el-icon-arrow-left," +
                    "button[aria-label*='Previous Month']"
            } else {
                ".el-date-picker__next-btn.el-icon-arrow-right," +
                    "button[aria-label*='Next Month']"
            }

        val q = JSONObject.quote(selector)

        return evalBoolean(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        r.width > 0 && r.height > 0;
                };

                const panels = [
                    ...document.querySelectorAll(
                        ".el-picker-panel.el-date-picker,.el-date-picker,.el-picker-panel"
                    )
                ].filter(isVisible);

                if (!panels.length) return false;

                const picker = panels
                    .map((el, index) => ({
                        el,
                        index,
                        z: Number.parseInt(getComputedStyle(el).zIndex || "0", 10) || 0
                    }))
                    .sort((a, b) => (b.z - a.z) || (b.index - a.index))[0].el;

                const button = [...picker.querySelectorAll($q)].find(isVisible);

                if (!button) return false;

                button.click();
                return true;
            })();
            """.trimIndent()
        )
    }

    private suspend fun clickDateInActivePicker(day: Int): Boolean {
        return evalBoolean(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        r.width > 0 && r.height > 0;
                };

                const panels = [
                    ...document.querySelectorAll(
                        ".el-picker-panel.el-date-picker,.el-date-picker,.el-picker-panel"
                    )
                ].filter(isVisible);

                if (!panels.length) return false;

                const picker = panels
                    .map((el, index) => ({
                        el,
                        index,
                        z: Number.parseInt(getComputedStyle(el).zIndex || "0", 10) || 0
                    }))
                    .sort((a, b) => (b.z - a.z) || (b.index - a.index))[0].el;

                const cells = [...picker.querySelectorAll("td")]
                    .filter(isVisible)
                    .filter(td => {
                        const cls = String(td.className || "");
                        return !cls.includes("prev-month") &&
                            !cls.includes("next-month") &&
                            !cls.includes("disabled") &&
                            (td.innerText || "").trim() === "$day";
                    });

                if (!cells.length) return false;

                const cell = cells[0];
                const clickable =
                    cell.querySelector("div > span") ||
                    cell.querySelector("span") ||
                    cell.querySelector("div") ||
                    cell;

                clickable.scrollIntoView({block: "center", inline: "nearest"});

                const rect = clickable.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                const target = document.elementFromPoint(x, y) || clickable;

                // 用与真实触摸最接近的一组事件点击日期。
                try {
                    if (window.PointerEvent) {
                        target.dispatchEvent(new PointerEvent("pointerdown", {
                            bubbles: true,
                            cancelable: true,
                            pointerType: "touch",
                            isPrimary: true,
                            clientX: x,
                            clientY: y
                        }));
                        target.dispatchEvent(new PointerEvent("pointerup", {
                            bubbles: true,
                            cancelable: true,
                            pointerType: "touch",
                            isPrimary: true,
                            clientX: x,
                            clientY: y
                        }));
                    }
                } catch (_) {
                }

                target.dispatchEvent(new MouseEvent("mousedown", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                }));

                target.dispatchEvent(new MouseEvent("mouseup", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                }));

                target.click();
                return true;
            })();
            """.trimIndent()
        )
    }

    private suspend fun waitForDateSelectedAndClosed(
        kind: String,
        expectedDate: String,
        timeoutMs: Long
    ): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {
            val actual = readDateFieldValue(kind)
            val closed = !isAnyDatePickerVisible()

            if (sameDateValue(actual, expectedDate) && closed) {
                return true
            }

            delay(100)
        }

        return false
    }

    private suspend fun isAnyDatePickerVisible(): Boolean {
        return evalBoolean(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        Number(style.opacity || 1) > 0 &&
                        r.width > 0 && r.height > 0;
                };

                return [
                    ...document.querySelectorAll(
                        ".el-picker-panel.el-date-picker,.el-date-picker,.el-picker-panel"
                    )
                ].some(isVisible);
            })();
            """.trimIndent()
        )
    }

    private suspend fun waitUntilNoDatePicker(timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {
            if (!isAnyDatePickerVisible()) return true
            delay(100)
        }

        return !isAnyDatePickerVisible()
    }

    private suspend fun closeOpenDatePickerSafely() {
        if (!isAnyDatePickerVisible()) return

        evalBoolean(
            """
            (() => {
                const fields = [
                    ...document.querySelectorAll(".el-date-editor input")
                ];

                for (const field of fields) {
                    try {
                        field.dispatchEvent(new KeyboardEvent("keydown", {
                            key: "Escape",
                            code: "Escape",
                            keyCode: 27,
                            which: 27,
                            bubbles: true
                        }));
                        field.blur();
                    } catch (_) {
                    }

                    // 调用 Element UI / Vue 组件自身的关闭函数。
                    // 注意：V6 不再直接修改日期面板 CSS。
                    try {
                        const root = field.closest(".el-date-editor");
                        const vm = root && root.__vue__;

                        if (vm) {
                            if (typeof vm.handleClose === "function") {
                                vm.handleClose();
                            }

                            if ("pickerVisible" in vm) {
                                vm.pickerVisible = false;
                            }
                        }
                    } catch (_) {
                    }
                }

                try {
                    document.dispatchEvent(new KeyboardEvent("keydown", {
                        key: "Escape",
                        code: "Escape",
                        keyCode: 27,
                        which: 27,
                        bubbles: true
                    }));
                } catch (_) {
                }

                // 再点一下主内容空白处，触发 Element UI clickoutside。
                try {
                    const outside =
                        document.querySelector(".app-main,.main-container,.el-main") ||
                        document.body;

                    if (outside) {
                        outside.dispatchEvent(new MouseEvent("mousedown", {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        outside.dispatchEvent(new MouseEvent("mouseup", {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                        outside.click();
                    }
                } catch (_) {
                }

                return true;
            })();
            """.trimIndent()
        )

        waitUntilNoDatePicker(1200)
    }

    private suspend fun readDateFieldValue(kind: String): String {
        val index = if (kind == "start") 0 else 1
        val keywords =
            if (kind == "start") {
                listOf("开始时间", "开始日期")
            } else {
                listOf("结束时间", "截止时间", "结束日期")
            }
        val keywordsJson = JSONArray(keywords).toString()

        return evalString(
            """
            (() => {
                const isVisible = el => {
                    if (!el) return false;
                    const style = getComputedStyle(el);
                    const r = el.getBoundingClientRect();
                    return style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        r.width > 0 && r.height > 0;
                };

                const keys = $keywordsJson;
                const inputs = [...document.querySelectorAll("input")].filter(isVisible);

                let field = inputs.find(x => {
                    const p = x.placeholder || "";
                    return keys.some(k => p.includes(k));
                });

                if (!field) {
                    const dateInputs = [
                        ...document.querySelectorAll(".el-date-editor input")
                    ].filter(isVisible);
                    field = dateInputs[$index];
                }

                return field ? (field.value || "") : "";
            })();
            """.trimIndent()
        )
    }

    private fun sameDateValue(actual: String, expected: String): Boolean {
        fun normalizeDate(value: String): String =
            value.trim()
                .replace("/", "-")
                .replace(".", "-")
                .replace("年", "-")
                .replace("月", "-")
                .replace("日", "")
                .replace(Regex("\\s+"), "")

        return normalizeDate(actual) == normalizeDate(expected)
    }

    private suspend fun clickSearch() {
        closeOpenDatePickerSafely()
        delay(120)

        val ok = evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const btn = [...document.querySelectorAll("button,.el-button")]
                    .filter(visible)
                    .find(x => (x.innerText || "").trim() === "搜索");

                if (!btn) return false;
                btn.click();
                return true;
            })();
            """.trimIndent()
        )

        if (!ok) error("找不到“搜索”按钮。")
    }

    private suspend fun waitForQueryRefresh(
        center: String,
        previousTotal: String,
        timeoutMs: Long = 30_000
    ) {
        val deadline = System.currentTimeMillis() + timeoutMs
        val start = System.currentTimeMillis()

        delay(300)

        while (System.currentTimeMillis() < deadline) {
            val loading = isLoadingVisible()

            if (!loading) {
                val centerVisible = tableHasCenter(center)
                val total = getCurrentTotalText()

                if (centerVisible && total.isNotBlank()) {
                    if (previousTotal.isBlank() || total != previousTotal) {
                        return
                    }

                    if (System.currentTimeMillis() - start >= 2_000) {
                        return
                    }
                }
            }

            delay(500)
        }

        error(
            "查询运营中心 $center 后，30 秒内未确认结果刷新完成。" +
                "为避免把上一笔结果重复导出，程序已停止。"
        )
    }

    private suspend fun isLoadingVisible(): Boolean {
        return evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
                return [
                    ...document.querySelectorAll(".el-loading-mask,.el-loading-spinner")
                ].some(visible);
            })();
            """.trimIndent()
        )
    }

    private suspend fun tableHasCenter(center: String): Boolean {
        val q = JSONObject.quote(center)

        return evalBoolean(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const selectors = [
                    ".el-table__body-wrapper tbody",
                    ".el-table__body-wrapper",
                    ".el-table tbody"
                ];

                return selectors.some(sel =>
                    [...document.querySelectorAll(sel)]
                        .filter(visible)
                        .some(x => (x.innerText || "").includes($q))
                );
            })();
            """.trimIndent()
        )
    }

    private suspend fun getCurrentTotalText(): String {
        return evalString(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const selectors = [
                    ".el-table__footer-wrapper tr",
                    ".el-table__body-wrapper tr",
                    ".el-table tr"
                ];

                for (const sel of selectors) {
                    const row = [...document.querySelectorAll(sel)]
                        .filter(visible)
                        .find(x => (x.innerText || "").includes("合计"));

                    if (row) {
                        return (row.innerText || "")
                            .replace(/\s+/g, " ")
                            .trim();
                    }
                }

                return "";
            })();
            """.trimIndent()
        )
    }

    private suspend fun extractTotal(): Pair<List<String>, List<String>> {
        val json = evalString(
            """
            (() => {
                const visible = el => !!el &&
                    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

                const norm = s =>
                    String(s || "").replace(/\s+/g, " ").trim();

                const headerSelectors = [
                    ".el-table__header-wrapper tr:last-child th",
                    ".el-table__header-wrapper th",
                    ".el-table thead th"
                ];

                let headers = [];

                for (const sel of headerSelectors) {
                    const values = [...document.querySelectorAll(sel)]
                        .filter(visible)
                        .map(x => norm(x.innerText))
                        .filter(Boolean);

                    if (values.length > headers.length) {
                        headers = values;
                    }
                }

                const rowSelectors = [
                    ".el-table__footer-wrapper tr",
                    ".el-table__body-wrapper tr",
                    ".el-table tr"
                ];

                let row = null;

                for (const sel of rowSelectors) {
                    row = [...document.querySelectorAll(sel)]
                        .filter(visible)
                        .find(x => norm(x.innerText).includes("合计"));

                    if (row) break;
                }

                if (!row) return "";

                const values = [...row.querySelectorAll("td")]
                    .map(x => norm(x.innerText));

                return JSON.stringify({headers, values});
            })();
            """.trimIndent()
        )

        if (json.isBlank()) {
            error("等待“合计”行超时或没有返回数据。")
        }

        val obj = JSONObject(json)
        val headersJson = obj.getJSONArray("headers")
        val valuesJson = obj.getJSONArray("values")

        val headers = MutableList(headersJson.length()) {
            headersJson.optString(it)
        }

        val values = MutableList(valuesJson.length()) {
            valuesJson.optString(it)
        }

        return headers to values
    }

    private fun cleanMetrics(
        rawHeaders: List<String>,
        rawValues: List<String>
    ): List<MetricValue> {
        val width = maxOf(rawHeaders.size, rawValues.size)

        val headers = rawHeaders.toMutableList()
        while (headers.size < width) {
            headers += "字段${headers.size + 1}"
        }

        val values = rawValues.toMutableList()
        while (values.size < width) {
            values += ""
        }

        return buildList {
            for (i in 0 until width) {
                val header = normalize(headers[i])
                val value = normalize(values[i])

                if (header.isBlank()) continue
                if (value.isBlank()) continue
                if (value == "合计") continue

                add(MetricValue(header, value))
            }
        }
    }

    private fun normalize(value: String): String =
        value.replace(Regex("\\s+"), " ").trim()

    private suspend fun evalBoolean(script: String): Boolean =
        evalRaw(script).trim() == "true"

    private suspend fun evalString(script: String): String {
        val raw = evalRaw(script).trim()

        if (raw == "null" || raw == "undefined") return ""
        if (!raw.startsWith("\"")) return raw

        return try {
            JSONArray("[$raw]").optString(0)
        } catch (_: Exception) {
            raw.removeSurrounding("\"")
        }
    }

    private suspend fun evalRaw(script: String): String =
        suspendCoroutine { continuation ->
            webView.evaluateJavascript(script) { result ->
                continuation.resume(result ?: "null")
            }
        }
}
