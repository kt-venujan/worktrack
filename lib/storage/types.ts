import type {Task} from '../model';
export type SheetData={name:string;values:unknown[][]};
export type TaskInput=Omit<Task,'id'|'row'>;
export interface TaskStorage {
 listSheets():Promise<SheetData[]>;
 create(client:string,task:TaskInput):Promise<{row:number}>;
 update(client:string,row:number,task:TaskInput):Promise<void>;
 delete(client:string,row:number):Promise<void>;
}
