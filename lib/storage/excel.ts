import 'server-only';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {headers} from '../model';
import type {TaskStorage,TaskInput,SheetData} from './types';
const filename=()=>path.resolve(process.env.EXCEL_FILE_PATH||path.join(process.cwd(),'data','Apptimate Changes.xlsx'));
// Serialized writes prevent two requests in this Node process from overwriting each other.
let queue:Promise<unknown>=Promise.resolve();
function serialize<T>(fn:()=>Promise<T>):Promise<T>{const result=queue.then(fn,fn);queue=result.then(()=>undefined,()=>undefined);return result;}
async function load(){const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(filename());return wb;}
function value(v:ExcelJS.CellValue):unknown {
 if(v instanceof Date)return v.toISOString().slice(0,10);
 if(v===null||v===undefined)return '';
 if(typeof v==='object'){
  if('result' in v)return value(v.result as ExcelJS.CellValue);
  if('text' in v)return String(v.text);
  if('richText' in v)return v.richText.map(x=>x.text).join('');
  return String(v);
 }
 return v;
}
async function save(wb:ExcelJS.Workbook){const target=filename();const tmp=target+'.tmp-'+process.pid+'-'+Date.now();try{await wb.xlsx.writeFile(tmp);await fs.rename(tmp,target)}finally{await fs.rm(tmp,{force:true}).catch(()=>{})}}
function getSheet(wb:ExcelJS.Workbook,client:string){const sheet=wb.getWorksheet(client);if(!sheet)throw Error('Unknown client worksheet');const first=String(value(sheet.getCell('A1').value)).trim().toLowerCase();if(first!=='changes'&&first!=='change')throw Error('Worksheet is not a task sheet');return sheet;}
function fields(task:TaskInput){return [task.change,task.type,task.givenDate,task.approval,task.status,task.deliverDate,task.dueDate,task.assignee].map(v=>String(v??''));}
function ensureHeaders(sheet:ExcelJS.Worksheet){for(let i=7;i<=8;i++){const cell=sheet.getCell(1,i);if(!String(value(cell.value)).trim())cell.value=headers[i-1];}}
export class ExcelStorage implements TaskStorage {
 async listSheets():Promise<SheetData[]>{// Wait for in-flight writes to finish before reading.
  await queue;const wb=await load();return wb.worksheets.map(sheet=>{
   const values:unknown[][]=[];
   for(let r=1;r<=sheet.rowCount;r++){
    const row:unknown[]=[];
    for(let c=1;c<=Math.max(8,sheet.columnCount);c++)row.push(value(sheet.getCell(r,c).value));
    values.push(row);
   }
   return {name:sheet.name,values};
  });
 }
 async create(client:string,task:TaskInput){return serialize(async()=>{if(!task.change?.trim())throw Error('Task description required');const wb=await load();const sheet=getSheet(wb,client);ensureHeaders(sheet);const row=Math.max(2,sheet.rowCount+1);fields(task).forEach((v,i)=>sheet.getCell(row,i+1).value=v);await save(wb);return {row};});}
 async update(client:string,row:number,task:TaskInput){return serialize(async()=>{if(!Number.isInteger(row)||row<2||!task.change?.trim())throw Error('Invalid task');const wb=await load();const sheet=getSheet(wb,client);if(row>sheet.rowCount)throw Error('Task row does not exist');ensureHeaders(sheet);fields(task).forEach((v,i)=>sheet.getCell(row,i+1).value=v);await save(wb);});}
}
