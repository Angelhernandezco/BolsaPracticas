import cors from 'cors';
import helmet from 'helmet';
import { forbidden } from '../lib/errors.js';
export function installSecurity(app,config) {
  const origins=config.origins || [];
  app.use(helmet({contentSecurityPolicy:false}));
  app.use((req,_res,next)=>{
    if(req.headers.origin && !origins.includes(req.headers.origin)) return next(forbidden());
    // Browsers may omit Origin on navigations: disallow cross-site cookie mutations too.
    if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers['sec-fetch-site']==='cross-site') return next(forbidden());
    next();
  });
  app.use(cors({origin:(origin,cb)=>cb(null,!origin || origins.includes(origin)),credentials:true}));
}
