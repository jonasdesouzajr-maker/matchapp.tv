'use strict';
// One opened file owns comparison and update. Never check a pathname and later
// reopen it for writing: another process may have replaced the file meanwhile.
const fs=require('node:fs');
function updateHistory(file,transform,filesystem=fs){
 let fd,created=false;
 try{fd=filesystem.openSync(file,'r+');}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  fd=filesystem.openSync(file,'wx+');created=true;
 }
 try{
  const before=filesystem.readFileSync(fd,'utf8');
  const history=created?[]:JSON.parse(before);
  if(!Array.isArray(history))throw new Error('Invalid International Day history');
  const result=transform(history);
  if(!Array.isArray(result))throw new Error('Invalid retained history output');
  const next=JSON.stringify(result,null,2)+'\n';
  if(next===before)return {changed:false,count:result.length};
  const bytes=Buffer.from(next,'utf8');
  for(let offset=0;offset<bytes.length;){
   const written=filesystem.writeSync(fd,bytes,offset,bytes.length-offset,offset);
   if(!Number.isInteger(written)||written<=0)throw new Error('Could not finish retained history write');
   offset+=written;
  }
  filesystem.ftruncateSync(fd,bytes.length);
  filesystem.fsyncSync(fd);
  return {changed:true,count:result.length};
 }finally{filesystem.closeSync(fd);}
}
module.exports={updateHistory};
