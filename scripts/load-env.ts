import { loadEnvConfig } from '@next/env';
// Match Next.js file precedence and $ expansion; never print parsed environment data.
loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production',{info:()=>{},error:()=>{}});
