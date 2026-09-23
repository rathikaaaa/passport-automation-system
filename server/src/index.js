require('dotenv').config();
const express=require('express'), cors=require('cors'), jwt=require('jsonwebtoken'), bcrypt=require('bcryptjs');
const {PrismaClient}=require('@prisma/client'); const {z}=require('zod'); const path=require('path'); const fs=require('fs'); const multer=require('multer');
const prisma=new PrismaClient(); const app=express();
app.use(cors({origin:true,credentials:true})); app.use(express.json());
const uploadDir=path.join(__dirname,'../uploads'); fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({dest:uploadDir});
const statuses=['DRAFT','SUBMITTED','DOCUMENT_VERIFICATION','POLICE_VERIFICATION','APPROVED','DISPATCHED','DELIVERED','REJECTED'];
function sign(user){return jwt.sign({id:user.id,role:user.role,email:user.email},process.env.JWT_SECRET||'dev-secret-change-me',{expiresIn:'7d'});}
async function auth(req,res,next){try{const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Authentication required'}); req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET||'dev-secret-change-me'); next()}catch(e){res.status(401).json({message:'Invalid or expired token'})}}
function role(...roles){return (req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Access denied'})}
function ok(res,data,status=200){res.status(status).json({success:true,data})}
function err(res,message,status=400){res.status(status).json({success:false,message})}
const userSelect={id:true,name:true,email:true,phone:true,dateOfBirth:true,gender:true,address:true,city:true,state:true,pincode:true,role:true,createdAt:true};
app.get('/api/health',(req,res)=>ok(res,{service:'Passport Automation API',status:'online',time:new Date()}));
app.post('/api/auth/register',async(req,res)=>{try{const s=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(6),phone:z.string().optional()}).parse(req.body); if(await prisma.user.findUnique({where:{email:s.email}})) return err(res,'Email already registered',409); const user=await prisma.user.create({data:{...s,password:await bcrypt.hash(s.password,10)}}); ok(res,{token:sign(user),user:{...user,password:undefined}},201)}catch(e){err(res,e.issues?.[0]?.message||e.message)}});
app.post('/api/auth/login',async(req,res)=>{try{const {email,password}=req.body; const user=await prisma.user.findUnique({where:{email}}); if(!user||!(await bcrypt.compare(password,user.password))) return err(res,'Invalid email or password',401); ok(res,{token:sign(user),user:{...user,password:undefined}})}catch(e){err(res,e.message,500)}});
app.get('/api/auth/me',auth,async(req,res)=>{const user=await prisma.user.findUnique({where:{id:req.user.id},select:userSelect}); ok(res,user)});
app.put('/api/users/profile',auth,async(req,res)=>{try{const data=z.object({name:z.string().min(2),phone:z.string().optional(),dateOfBirth:z.string().optional(),gender:z.string().optional(),address:z.string().optional(),city:z.string().optional(),state:z.string().optional(),pincode:z.string().optional()}).parse(req.body); const user=await prisma.user.update({where:{id:req.user.id},data:{...data,dateOfBirth:data.dateOfBirth?new Date(data.dateOfBirth):undefined},select:userSelect}); ok(res,user)}catch(e){err(res,e.issues?.[0]?.message||e.message)}});
async function nextNumber(){const count=await prisma.passportApplication.count(); return `PAS-${new Date().getFullYear()}-${String(count+1).padStart(5,'0')}`}
app.get('/api/track/:applicationNumber',async(req,res)=>{const a=await prisma.passportApplication.findUnique({where:{applicationNumber:req.params.applicationNumber},select:{applicationNumber:true,status:true,updatedAt:true}}); if(!a)return err(res,'Application not found',404); ok(res,a)});
app.get('/api/applications',auth,async(req,res)=>{const where=req.user.role==='ADMIN'?{}:{userId:req.user.id}; const apps=await prisma.passportApplication.findMany({where,include:{user:{select:userSelect},documents:true,policeVerification:true},orderBy:{createdAt:'desc'}}); ok(res,apps)});
app.post('/api/applications',auth,async(req,res)=>{try{const data=z.object({passportType:z.string().optional(),applicationType:z.string().optional(),placeOfBirth:z.string().optional(),maritalStatus:z.string().optional(),nationality:z.string().optional(),employmentType:z.string().optional()}).parse(req.body); const appn=await prisma.passportApplication.create({data:{...data,userId:req.user.id,applicationNumber:await nextNumber()}}); await prisma.auditLog.create({data:{userId:req.user.id,applicationId:appn.id,action:'CREATE_APPLICATION',description:`Created ${appn.applicationNumber}`}}); ok(res,appn,201)}catch(e){err(res,e.message)}});
app.get('/api/applications/:id',auth,async(req,res)=>{const a=await prisma.passportApplication.findUnique({where:{id:req.params.id},include:{user:{select:userSelect},documents:true,policeVerification:true,auditLogs:{orderBy:{createdAt:'desc'}}}}); if(!a)return err(res,'Application not found',404); if(req.user.role!=='ADMIN'&&a.userId!==req.user.id)return err(res,'Access denied',403); ok(res,a)});
app.put('/api/applications/:id',auth,async(req,res)=>{const a=await prisma.passportApplication.findUnique({where:{id:req.params.id}}); if(!a)return err(res,'Not found',404); if(req.user.role!=='ADMIN'&&a.userId!==req.user.id)return err(res,'Access denied',403); if(a.status!=='DRAFT'&&req.user.role!=='ADMIN')return err(res,'Submitted applications cannot be edited'); const data=req.body; const updated=await prisma.passportApplication.update({where:{id:a.id},data:{passportType:data.passportType,applicationType:data.applicationType,placeOfBirth:data.placeOfBirth,maritalStatus:data.maritalStatus,nationality:data.nationality,employmentType:data.employmentType}}); ok(res,updated)});
app.delete('/api/applications/:id',auth,async(req,res)=>{const a=await prisma.passportApplication.findUnique({where:{id:req.params.id}}); if(!a)return err(res,'Not found',404); if(a.userId!==req.user.id)return err(res,'Access denied',403); await prisma.passportApplication.delete({where:{id:a.id}}); ok(res,{deleted:true})});
app.post('/api/applications/:id/submit',auth,async(req,res)=>{const a=await prisma.passportApplication.findUnique({where:{id:req.params.id}}); if(!a||a.userId!==req.user.id)return err(res,'Application not found',404); const u=await prisma.passportApplication.update({where:{id:a.id},data:{status:'SUBMITTED',submittedAt:new Date()}}); await prisma.notification.create({data:{userId:req.user.id,title:'Application Submitted',message:`${a.applicationNumber} has been submitted successfully.`}}); await prisma.auditLog.create({data:{userId:req.user.id,applicationId:a.id,action:'SUBMIT',description:'Application submitted'}}); ok(res,u)});
app.get('/api/documents',auth,async(req,res)=>{const docs=await prisma.document.findMany({where:req.user.role==='ADMIN'?{}:{application:{userId:req.user.id}},include:{application:true},orderBy:{uploadedAt:'desc'}}); ok(res,docs)});
app.post('/api/documents',auth,upload.single('file'),async(req,res)=>{try{const {applicationId,documentType}=req.body; const a=await prisma.passportApplication.findUnique({where:{id:applicationId}}); if(!a||a.userId!==req.user.id)return err(res,'Application not found',404); const d=await prisma.document.create({data:{applicationId,documentType:documentType||'Other',fileName:req.file?.originalname||'Demo_Document.pdf',fileUrl:req.file?`/uploads/${req.file.filename}`:'#'}}); ok(res,d,201)}catch(e){err(res,e.message)}});
app.put('/api/documents/:id/verify',auth,role('ADMIN'),async(req,res)=>{const d=await prisma.document.findUnique({where:{id:req.params.id},include:{application:true}}); if(!d)return err(res,'Document not found',404); const status=req.body.verificationStatus; if(!['PENDING','VERIFIED','REJECTED'].includes(status))return err(res,'Invalid verification status'); const u=await prisma.document.update({where:{id:d.id},data:{verificationStatus:status,remarks:req.body.remarks||null}}); await prisma.auditLog.create({data:{userId:req.user.id,applicationId:d.applicationId,action:'DOCUMENT_'+status,description:`${d.documentType} marked ${status}`}}); ok(res,u)});
app.put('/api/applications/:id/status',auth,role('ADMIN'),async(req,res)=>{try{const status=req.body.status; if(!statuses.includes(status))return err(res,'Invalid status'); const a=await prisma.passportApplication.findUnique({where:{id:req.params.id}}); if(!a)return err(res,'Application not found',404); const u=await prisma.passportApplication.update({where:{id:a.id},data:{status,adminRemarks:req.body.remarks||a.adminRemarks}}); await prisma.notification.create({data:{userId:a.userId,title:'Application Status Updated',message:`${a.applicationNumber} is now ${status.replaceAll('_',' ')}.${req.body.remarks?' Remark: '+req.body.remarks:''}`}}); await prisma.auditLog.create({data:{userId:req.user.id,applicationId:a.id,action:'STATUS_UPDATE',description:`Status changed to ${status}`}}); ok(res,u)}catch(e){err(res,e.message)}});
app.get('/api/notifications',auth,async(req,res)=>ok(res,await prisma.notification.findMany({where:{userId:req.user.id},orderBy:{createdAt:'desc'}})));
app.put('/api/notifications/:id/read',auth,async(req,res)=>{const n=await prisma.notification.updateMany({where:{id:req.params.id,userId:req.user.id},data:{isRead:true}}); ok(res,n)});
app.get('/api/admin/dashboard',auth,role('ADMIN'),async(req,res)=>{const [total,pending,approved,rejected,police,group]=await Promise.all([prisma.passportApplication.count(),prisma.passportApplication.count({where:{status:{in:['SUBMITTED','DOCUMENT_VERIFICATION','POLICE_VERIFICATION']}}}),prisma.passportApplication.count({where:{status:{in:['APPROVED','DISPATCHED','DELIVERED']}}}),prisma.passportApplication.count({where:{status:'REJECTED'}}),prisma.passportApplication.count({where:{status:'POLICE_VERIFICATION'}}),prisma.passportApplication.groupBy({by:['status'],_count:{_all:true}})]); ok(res,{total,pending,approved,rejected,police,byStatus:group.map(x=>({status:x.status,count:x._count._all}))})});
app.get('/api/admin/applications',auth,role('ADMIN'),async(req,res)=>{const {search,status,page='1',limit='10'}=req.query; const p=Math.max(1,Number(page)),l=Math.min(50,Math.max(1,Number(limit))); const where={...(status&&status!=='ALL'?{status}:{}),...(search?{OR:[{applicationNumber:{contains:search,mode:'insensitive'}},{user:{name:{contains:search,mode:'insensitive'}}},{user:{email:{contains:search,mode:'insensitive'}}}]}:{})}; const [items,total]=await Promise.all([prisma.passportApplication.findMany({where,include:{user:{select:userSelect},documents:true},orderBy:{updatedAt:'desc'},skip:(p-1)*l,take:l}),prisma.passportApplication.count({where})]); ok(res,{items,total,page:p,pages:Math.ceil(total/l)})});
app.get('/api/admin/users',auth,role('ADMIN'),async(req,res)=>ok(res,await prisma.user.findMany({select:{...userSelect,_count:{select:{applications:true}}},orderBy:{createdAt:'desc'}})));
app.get('/api/admin/audit-logs',auth,role('ADMIN'),async(req,res)=>ok(res,await prisma.auditLog.findMany({include:{user:{select:{name:true,email:true}},application:true},orderBy:{createdAt:'desc'},take:100})));
app.get('/api/admin/police', auth, role('ADMIN'), async (req,res) => { const rows = await prisma.policeVerification.findMany({ include: { application: { include: { user: { select: userSelect } } } }, orderBy: { verificationDate: 'desc' } }); ok(res, rows); });
app.use('/uploads',express.static(uploadDir));
app.use((req,res)=>err(res,'Route not found',404));
async function seedDemoUsers(){
  const users=[
    {name:'Demo Applicant',email:'applicant@passportdemo.com',password:'Applicant@123',role:'APPLICANT'},
    {name:'Demo Admin',email:'admin@passportdemo.com',password:'Admin@123',role:'ADMIN'}
  ];

  for(const u of users){
    const existing=await prisma.user.findUnique({
      where:{email:u.email}
    });

    if(!existing){
      await prisma.user.create({
        data:{
          name:u.name,
          email:u.email,
          password:await bcrypt.hash(u.password,10),
          role:u.role
        }
      });

      console.log(`Demo user created: ${u.email}`);
    }
  }
}

seedDemoUsers()
  .then(()=>app.listen(
    process.env.PORT||5000,
    ()=>console.log(`API running on port ${process.env.PORT||5000}`)
  ))
  .catch(e=>{
    console.error('Demo user setup failed:',e);
    process.exit(1);
  });
