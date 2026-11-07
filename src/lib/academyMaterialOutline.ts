export interface HeadingItem { id: string; level: number; title: string; line: number; }
function slugify(value:string):string{return value.toLocaleLowerCase('de-DE').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'abschnitt';}
export function extractHeadings(markdown:string):HeadingItem[]{
 const counts=new Map<string,number>();const result:HeadingItem[]=[];const lines=markdown.split(/\r?\n/);let fence:{char:string;length:number}|null=null;
 const add=(titleText:string,level:number,line:number)=>{const title=titleText.replace(/\[(.*?)\]\([^)]*\)/g,'$1').replace(/[*_~]/g,'').replace(/\x60/g,'').trim();if(!title)return;const base=slugify(title);const count=counts.get(base)||0;counts.set(base,count+1);result.push({id:count?base+'-'+count:base,level,title,line});};
 for(let index=0;index<lines.length;index++){const line=lines[index];if(fence){const close=line.match(/^ {0,3}(\x60{3,}|~{3,})[ \t]*$/);if(close&&close[1][0]===fence.char&&close[1].length>=fence.length)fence=null;continue;}const opening=line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/);if(opening){fence={char:opening[1][0],length:opening[1].length};continue;}const atx=line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);if(atx){add(atx[2],atx[1].length,index+1);continue;}if(line.trim()&&index+1<lines.length){const setext=lines[index+1].match(/^ {0,3}(=+|-+)\s*$/);if(setext){add(line.trim(),setext[1][0]==='='?1:2,index+1);index++;}}}
 return result;
}
