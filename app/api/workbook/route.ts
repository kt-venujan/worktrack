import {NextRequest,NextResponse} from 'next/server';
import {storage} from '../../../lib/storage';
import {requireUser} from '../../../lib/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(e:unknown)=>NextResponse.json({error:e instanceof Error?e.message:'Unexpected error'},{status:400});
const denied=()=>NextResponse.json({error:'Unauthorized'},{status:401});
export async function GET(){if(!await requireUser())return denied();try{return NextResponse.json({sheets:await storage.listSheets()},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}
export async function POST(req:NextRequest){if(!await requireUser())return denied();try{const {client,task}=await req.json();if(typeof client!=='string'||!task)throw Error('Invalid request');return NextResponse.json({ok:true,...await storage.create(client,task)})}catch(e){return fail(e)}}
export async function PATCH(req:NextRequest){if(!await requireUser())return denied();try{const {client,row,task}=await req.json();if(typeof client!=='string'||!Number.isSafeInteger(row)||!task)throw Error('Invalid request');await storage.update(client,row,task);return NextResponse.json({ok:true})}catch(e){return fail(e)}}
export async function DELETE(req:NextRequest){if(!await requireUser())return denied();try{const {client,row}=await req.json();if(typeof client!=='string'||!Number.isSafeInteger(row))throw Error('Invalid request');await storage.delete(client,row);return NextResponse.json({ok:true})}catch(e){return fail(e)}}
