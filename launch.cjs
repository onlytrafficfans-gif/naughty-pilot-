const {spawn,spawnSync}=require('node:child_process');
const {existsSync}=require('node:fs');
const path=require('node:path');
process.chdir(__dirname);
if(Number(process.versions.node.split('.')[0])<24){console.error('Install Node.js 24 or newer from https://nodejs.org, then run this launcher again.');process.exit(1);}
if(!existsSync(path.join(__dirname,'node_modules','express'))){
  console.log('Installing application dependencies…');
  const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['install','--omit=dev','--package-lock=false','--no-audit','--no-fund'],{stdio:'inherit',shell:process.platform==='win32'});
  if(result.error || result.status!==0)process.exit(1);
}
const server=spawn(process.execPath,['server.mjs','--built','--host','127.0.0.1','--port','4178'],{stdio:['inherit','pipe','inherit'],env:{...process.env,NODE_ENV:'development'}});
let opened=false;
server.stdout.on('data',data=>{
  process.stdout.write(data);
  if(!opened && data.toString().includes('Naughty Pilot cockpit listening')){
    opened=true;const address='http://127.0.0.1:4178';
    const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd.exe':'xdg-open';
    const args=process.platform==='win32'?['/c','start','',address]:[address];
    const browser=spawn(command,args,{stdio:'ignore'});browser.on('error',()=>console.log('Open your browser at '+address));browser.unref();
  }
});
process.on('SIGINT',()=>server.kill('SIGINT'));
process.on('SIGTERM',()=>server.kill('SIGTERM'));
server.on('exit',code=>process.exit(code || 0));
