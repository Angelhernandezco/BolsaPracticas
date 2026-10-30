import { serializeUser } from '../../lib/serializers.js';
export function createAuthController(ctx,service) {
  const cookieOptions={httpOnly:true,sameSite:'lax',secure:ctx.config.secure,path:'/api'};
  async function sendSession(res,user,status=200,extras={}) {
    const {token}=await service.createSession(user.id);
    res.cookie('bolsa-token',token,{...cookieOptions,maxAge:8*3600_000});
    res.status(status).json({...serializeUser(user),...extras});
  }
  return {
    register:async(req,res)=>{const user=await service.register(req.body); await sendSession(res,user,201);},
    login:async(req,res)=>sendSession(res,await service.login(req.body)),
    session:(req,res)=>res.json(serializeUser(req.user)),
    logout:async(req,res)=>{await service.logout(req.sessionId);res.clearCookie('bolsa-token',cookieOptions).json({ok:true});}
  };
}
