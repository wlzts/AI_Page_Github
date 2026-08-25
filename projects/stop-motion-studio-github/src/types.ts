export type Frame={id:string;blob:Blob;thumb:Blob;createdAt:number};
export type Project={id:string;name:string;fps:number;loop:boolean;onionSkin:boolean;onionOpacity:number;frames:Frame[];updatedAt:number};
