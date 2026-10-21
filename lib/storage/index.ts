import 'server-only';
import type {TaskStorage} from './types';
import {GoogleSheetsStorage} from './google-sheets';
export const storage:TaskStorage=new GoogleSheetsStorage();
