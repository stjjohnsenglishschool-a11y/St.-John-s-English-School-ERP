do $$
declare sid uuid; sess uuid; cid uuid; class_name text; section_name text;
begin
  insert into public.schools(name,code,email,phone,address,city,state,country,pincode,timezone,currency)
  values ('St. John''s English School','SJES',null,'9674368297','Dankuni, Hooghly 712311','Dankuni','West Bengal','India','712311','Asia/Kolkata','INR')
  on conflict(code) do update set name=excluded.name,phone=excluded.phone,address=excluded.address,city=excluded.city,state=excluded.state,pincode=excluded.pincode
  returning id into sid;
  insert into public.academic_sessions(school_id,name,start_date,end_date,is_current)
  values(sid,'2026–27','2026-04-01','2027-03-31',true) on conflict(school_id,name) do update set is_current=true returning id into sess;
  foreach class_name in array array['Nursery','LKG','UKG','I','II','III','IV','V','VI','VII','VIII','IX','X'] loop
    insert into public.classes(school_id,name,sort_order) values(sid,class_name,array_position(array['Nursery','LKG','UKG','I','II','III','IV','V','VI','VII','VIII','IX','X'],class_name)) on conflict(school_id,name) do update set name=excluded.name returning id into cid;
    foreach section_name in array array['A','B','C'] loop insert into public.sections(class_id,name,capacity) values(cid,section_name,45) on conflict(class_id,name) do nothing; end loop;
  end loop;
  insert into public.fee_heads(school_id,name,code,description) values
    (sid,'Admission Fee','ADM','One-time admission charge'),(sid,'Tuition Fee','TUI','Monthly tuition fee'),(sid,'Annual Fee','ANN','Annual school charge'),(sid,'Examination Fee','EXM','Examination charge'),(sid,'Development Fee','DEV','School development charge') on conflict(school_id,name) do nothing;
  insert into public.grade_scales(school_id,name,min_percent,max_percent,grade,grade_point,remarks) values
    (sid,'Standard',90,100,'A+',10,'Outstanding'),(sid,'Standard',80,89.99,'A',9,'Excellent'),(sid,'Standard',70,79.99,'B+',8,'Very good'),(sid,'Standard',60,69.99,'B',7,'Good'),(sid,'Standard',50,59.99,'C',6,'Satisfactory'),(sid,'Standard',40,49.99,'D',5,'Pass'),(sid,'Standard',0,39.99,'F',0,'Needs improvement');
end $$;
