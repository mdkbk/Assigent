import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:8000'
const TASK_TYPES = ['essay','coding','report','math','presentation','other']

const STATUS = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  analyzing: { label: 'Analyzing', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  drafting:  { label: 'Drafting',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  reviewing: { label: 'Reviewing', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  approved:  { label: 'Approved',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  submitted: { label: 'Submitted', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date()
  const days = Math.ceil(diff / 86400000)
  if (days < 0)   return { text: 'Overdue',       color: '#ef4444' }
  if (days === 0) return { text: 'Due today',     color: '#ef4444' }
  if (days === 1) return { text: '1 day left',    color: '#f59e0b' }
  if (days <= 3)  return { text: `${days}d left`, color: '#f59e0b' }
  return { text: `${days}d left`, color: '#22c55e' }
}

function fmt(d) {
  return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})
}

function Spinner({ size=16, color='#7c6af7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite',flexShrink:0}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round"/>
    </svg>
  )
}

function Badge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:100,background:s.bg,color:s.color,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{s.label}</span>
}

function Btn({ children, onClick, disabled, variant='default', loading, style={} }) {
  const variants = {
    default: { background:'rgba(255,255,255,0.06)', color:'#e0e0e8', border:'1px solid rgba(255,255,255,0.08)' },
    primary: { background:'#7c6af7', color:'white', border:'none' },
    success: { background:'rgba(34,197,94,0.15)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.2)' },
    danger:  { background:'rgba(239,68,68,0.12)',  color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' },
  }
  const v = variants[variant] || variants.default
  return (
    <button onClick={onClick} disabled={disabled||loading}
      style={{...v,borderRadius:10,padding:'9px 16px',fontSize:13,fontWeight:500,display:'flex',alignItems:'center',gap:7,...style}}>
      {loading && <Spinner size={13} color="currentColor"/>}
      {children}
    </button>
  )
}

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:24,backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#17171a',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:32,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 80px rgba(0,0,0,0.6)'}}>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({ children }) {
  return <label style={{display:'block',fontSize:11,fontWeight:600,color:'#9090a0',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{children}</label>
}

function NewAssignmentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({title:'',deadline:'',requirements:'',task_type:'essay'})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function submit() {
    if (!form.title||!form.deadline||!form.requirements) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/assignments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      if (!res.ok) throw new Error()
      onCreated(await res.json())
      setForm({title:'',deadline:'',requirements:'',task_type:'essay'})
    } catch { setError('Failed to create. Is the server running?') }
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:24,color:'#f0f0f2'}}>New Assignment</h2>
      <div style={{display:'grid',gap:16}}>
        <div><FieldLabel>Title</FieldLabel><input placeholder="e.g. Data Structures Assignment 3" value={form.title} onChange={e=>set('title',e.target.value)}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><FieldLabel>Deadline</FieldLabel><input type="datetime-local" value={form.deadline} onChange={e=>set('deadline',e.target.value)}/></div>
          <div><FieldLabel>Type</FieldLabel>
            <select value={form.task_type} onChange={e=>set('task_type',e.target.value)}>
              {TASK_TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div><FieldLabel>Assignment Instructions</FieldLabel><textarea rows={6} placeholder="Paste the full assignment instructions here..." value={form.requirements} onChange={e=>set('requirements',e.target.value)}/></div>
        {error && <p style={{color:'#ef4444',fontSize:13}}>{error}</p>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:4}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} loading={loading} variant="primary">Create Assignment</Btn>
        </div>
      </div>
    </Modal>
  )
}

function DeleteConfirmModal({ open, assignment, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)
  async function confirm() {
    setLoading(true)
    try {
      await fetch(`${API}/assignments/${assignment.id}`, { method: 'DELETE' })
      onDeleted(assignment.id)
    } catch { alert('Failed to delete.') }
    setLoading(false)
  }
  return (
    <Modal open={open} onClose={onClose}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:12,color:'#f0f0f2'}}>Delete Assignment?</h2>
      <p style={{fontSize:14,color:'#9090a0',marginBottom:24,lineHeight:1.6}}>
        "<span style={{color:'#f0f0f2'}}>{assignment?.title}</span>" will be permanently deleted. This cannot be undone.
      </p>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={confirm} loading={loading} variant="danger">Delete</Btn>
      </div>
    </Modal>
  )
}

function SidebarItem({ a, selected, onClick, onDelete }) {
  const dl = daysLeft(a.deadline)
  return (
    <div style={{
      padding:'14px 16px', borderRadius:12, cursor:'pointer', marginBottom:6,
      background: selected ? 'rgba(124,106,247,0.12)' : 'transparent',
      border: selected ? '1px solid rgba(124,106,247,0.3)' : '1px solid transparent',
      transition:'all 0.15s', position:'relative',
    }}
    onClick={() => onClick(a)}
    >
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:8}}>
        <p style={{fontWeight:600,fontSize:13,color:'#f0f0f2',lineHeight:1.3,flex:1}}>{a.title}</p>
        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <Badge status={a.status}/>
          <button
            onClick={e => { e.stopPropagation(); onDelete(a) }}
            style={{background:'none',border:'none',color:'#3a3a4a',fontSize:14,padding:'2px 4px',borderRadius:4,lineHeight:1,cursor:'pointer',transition:'color 0.15s'}}
            onMouseEnter={e=>e.target.style.color='#ef4444'}
            onMouseLeave={e=>e.target.style.color='#3a3a4a'}
            title="Delete assignment"
          >✕</button>
        </div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:11,color:'#5a5a6a',textTransform:'capitalize'}}>{a.task_type}</span>
        <span style={{fontSize:11,fontWeight:600,color:dl.color}}>{dl.text}</span>
      </div>
    </div>
  )
}

function AgentStep({ number, label, desc, done, running, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled||running} style={{
      background: done?'rgba(34,197,94,0.08)':'rgba(255,255,255,0.03)',
      border: done?'1px solid rgba(34,197,94,0.2)':'1px solid rgba(255,255,255,0.06)',
      borderRadius:12,padding:'14px 16px',textAlign:'left',width:'100%',
      display:'flex',alignItems:'center',gap:14,
      cursor:(disabled||running)?'not-allowed':'pointer',transition:'all 0.15s',
    }}>
      <div style={{
        width:32,height:32,borderRadius:'50%',flexShrink:0,
        background:done?'rgba(34,197,94,0.2)':running?'rgba(124,106,247,0.2)':'rgba(255,255,255,0.06)',
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,
        color:done?'#22c55e':running?'#7c6af7':'#9090a0',
      }}>
        {running?<Spinner size={14} color="#7c6af7"/>:done?'✓':number}
      </div>
      <div style={{flex:1}}>
        <p style={{fontSize:13,fontWeight:600,color:'#f0f0f2',marginBottom:2}}>{label}</p>
        <p style={{fontSize:11,color:'#5a5a6a'}}>{desc}</p>
      </div>
      {!done&&!running&&<span style={{fontSize:11,color:'#7c6af7',fontWeight:600}}>Run →</span>}
    </button>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000) }
  return <Btn onClick={copy} style={{fontSize:12,padding:'6px 12px'}}>{copied?'✓ Copied!':'Copy'}</Btn>
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:4,padding:'0 24px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>onChange(t)} style={{
          background:'none',borderRadius:0,padding:'12px 14px',fontSize:13,
          color:active===t?'#f0f0f2':'#5a5a6a',fontWeight:active===t?600:400,
          borderBottom:active===t?'2px solid #7c6af7':'2px solid transparent',
          transition:'all 0.15s',textTransform:'capitalize',
        }}>{t}</button>
      ))}
    </div>
  )
}

function ListSection({ label, items, color='#9090a0' }) {
  if (!items?.length) return null
  return (
    <div>
      <p style={{fontSize:11,fontWeight:600,color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{label}</p>
      <div style={{display:'grid',gap:6}}>
        {items.map((item,i)=>(
          <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <span style={{color,marginTop:2,flexShrink:0}}>–</span>
            <p style={{fontSize:13,color:'#c0c0cc',lineHeight:1.6}}>{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty({ message, action }) {
  return (
    <div style={{textAlign:'center',padding:'60px 20px',color:'#5a5a6a'}}>
      <p style={{fontSize:15,fontWeight:500,color:'#555',marginBottom:8}}>{message}</p>
      <p style={{fontSize:13}}>{action}</p>
    </div>
  )
}

function DetailPanel({ assignment, onRefresh }) {
  const [tab, setTab] = useState('agents')
  const [running, setRunning] = useState(null)
  const [checklist, setChecklist] = useState({})

  // Reset tab when assignment changes
  useEffect(() => { setTab('agents'); setRunning(null) }, [assignment.id])

  const analysis = assignment.analysis ? (() => { try { return JSON.parse(assignment.analysis) } catch { return null } })() : null
  const review   = assignment.review   ? (() => { try { return JSON.parse(assignment.review)   } catch { return null } })() : null

  async function run(action) {
    setRunning(action)
    try {
      const res = await fetch(`${API}/assignments/${assignment.id}/${action}`, { method:'POST' })
      if (!res.ok) throw new Error(await res.text())
      await onRefresh()
    } catch(e) { alert('Error: ' + e.message) }
    setRunning(null)
  }

  const dl = daysLeft(assignment.deadline)

  return (
    <div style={{background:'#17171a',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'24px 28px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div style={{flex:1,marginRight:16}}>
            <h2 style={{fontSize:20,fontWeight:700,marginBottom:6,color:'#f0f0f2'}}>{assignment.title}</h2>
            <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#5a5a6a'}}>Due {fmt(assignment.deadline)}</span>
              <span style={{fontSize:12,fontWeight:600,color:dl.color}}>● {dl.text}</span>
              <span style={{fontSize:12,color:'#5a5a6a',textTransform:'capitalize',background:'rgba(255,255,255,0.05)',padding:'2px 8px',borderRadius:6}}>{assignment.task_type}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
            <Badge status={assignment.status}/>
            <Btn onClick={()=>run('run-pipeline')} loading={running==='run-pipeline'} variant="primary" style={{padding:'9px 18px'}}>
              {running==='run-pipeline'?'Running...':'▶ Run All Agents'}
            </Btn>
          </div>
        </div>
      </div>

      <TabBar tabs={['agents','requirements','draft','review','submit']} active={tab} onChange={setTab}/>

      <div style={{overflowY:'auto',padding:'24px 28px',maxHeight:520}}>

        {tab==='agents' && (
          <div style={{display:'grid',gap:10}}>
            <AgentStep number="1" label="Requirement Analyzer" desc="Extracts task type, criteria, and constraints"
              done={!!analysis} running={running==='analyze'} onClick={()=>run('analyze')} disabled={!!running&&running!=='analyze'}/>
            <AgentStep number="2" label="Execution Agent" desc="Generates a complete draft solution"
              done={!!assignment.draft} running={running==='draft'} onClick={()=>run('draft')} disabled={!!running&&running!=='draft'}/>
            <AgentStep number="3" label="Review Agent" desc="Scores your draft like a strict professor"
              done={!!review} running={running==='review'} onClick={()=>run('review')} disabled={!!running&&running!=='review'}/>
            <AgentStep number="4" label="Submission Assistant" desc="Generates your final checklist"
              done={assignment.status==='approved'||assignment.status==='submitted'} running={running==='submit-prep'}
              onClick={()=>run('submit-prep')} disabled={!!running&&running!=='submit-prep'}/>
            {review && (
              <div style={{marginTop:8,background:'rgba(124,106,247,0.08)',border:'1px solid rgba(124,106,247,0.2)',borderRadius:12,padding:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:'#f0f0f2',marginBottom:2}}>Draft score</p>
                  <p style={{fontSize:11,color:'#9090a0'}}>{review.overall_feedback?.slice(0,80)}...</p>
                </div>
                <div style={{fontSize:36,fontWeight:800,color:review.score>=8?'#22c55e':review.score>=6?'#f59e0b':'#ef4444'}}>
                  {review.score}<span style={{fontSize:16,color:'#5a5a6a',fontWeight:400}}>/10</span>
                </div>
              </div>
            )}
          </div>
        )}

        {tab==='requirements' && (
          <div style={{display:'grid',gap:20}}>
            <div>
              <p style={{fontSize:11,fontWeight:600,color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Original Instructions</p>
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:18}}>
                <p style={{fontSize:13,color:'#c0c0cc',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{assignment.requirements}</p>
              </div>
            </div>
            {analysis ? (
              <div style={{display:'grid',gap:16}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[{label:'Task Type',value:analysis.task_type},{label:'Output Format',value:analysis.output_format},{label:'Est. Hours',value:`${analysis.estimated_hours}h`}].map(({label,value})=>(
                    <div key={label} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:14}}>
                      <p style={{fontSize:10,color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{label}</p>
                      <p style={{fontSize:13,fontWeight:500,color:'#e0e0e8',textTransform:'capitalize'}}>{value}</p>
                    </div>
                  ))}
                </div>
                <ListSection label="Key Requirements" items={analysis.key_requirements} color="#7c6af7"/>
                <ListSection label="Evaluation Criteria" items={analysis.evaluation_criteria} color="#22c55e"/>
                <ListSection label="Constraints" items={analysis.constraints} color="#f59e0b"/>
              </div>
            ) : <Empty message="No analysis yet" action="Go to Agents tab and run the Analyzer"/>}
          </div>
        )}

        {tab==='draft' && (
          !assignment.draft
            ? <Empty message="No draft yet" action="Run the Execution Agent to generate a draft"/>
            : <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <p style={{fontSize:11,fontWeight:600,color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'0.06em'}}>Generated Draft</p>
                  <CopyBtn text={assignment.draft}/>
                </div>
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:20}}>
                  <pre style={{fontSize:13,lineHeight:1.9,whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#c8c8d8'}}>{assignment.draft}</pre>
                </div>
              </div>
        )}

        {tab==='review' && (
          !review
            ? <Empty message="No review yet" action="Run the Review Agent to get professor feedback"/>
            : <div style={{display:'grid',gap:20}}>
                <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:24,display:'flex',alignItems:'center',gap:24}}>
                  <div style={{fontSize:56,fontWeight:800,color:review.score>=8?'#22c55e':review.score>=6?'#f59e0b':'#ef4444',lineHeight:1}}>
                    {review.score}<span style={{fontSize:22,color:'#5a5a6a',fontWeight:400}}>/10</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,marginBottom:12,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${review.score*10}%`,background:review.score>=8?'#22c55e':review.score>=6?'#f59e0b':'#ef4444',borderRadius:3}}/>
                    </div>
                    <p style={{fontSize:13,color:'#9090a0',lineHeight:1.7}}>{review.overall_feedback}</p>
                  </div>
                </div>
                <ListSection label="Missing Elements" items={review.missing_elements} color="#ef4444"/>
                <ListSection label="Weak Areas" items={review.weak_areas} color="#f59e0b"/>
                <ListSection label="Suggestions" items={review.suggestions} color="#7c6af7"/>
                <Btn onClick={()=>run('draft')} loading={running==='draft'} variant="primary">Regenerate Draft with Feedback</Btn>
              </div>
        )}

        {tab==='submit' && (
          <div style={{display:'grid',gap:20}}>
            <div>
              <p style={{fontSize:11,fontWeight:600,color:'#5a5a6a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:12}}>Submission Checklist</p>
              <div style={{display:'grid',gap:8}}>
                {['Review draft one final time for accuracy','Check all assignment requirements are met','Verify formatting matches requirements','Proofread for grammar and spelling','Save/export as the required file format','Check the deadline and timezone','Upload to Canvas / submission portal','Confirm submission was received'].map((item,i)=>(
                  <div key={i} onClick={()=>setChecklist(c=>({...c,[i]:!c[i]}))}
                    style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:10,cursor:'pointer',
                      background:checklist[i]?'rgba(34,197,94,0.06)':'rgba(255,255,255,0.03)',
                      border:checklist[i]?'1px solid rgba(34,197,94,0.2)':'1px solid rgba(255,255,255,0.06)',transition:'all 0.15s'}}>
                    <div style={{width:20,height:20,borderRadius:6,border:checklist[i]?'none':'1.5px solid rgba(255,255,255,0.15)',flexShrink:0,
                      background:checklist[i]?'#22c55e':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {checklist[i]&&<span style={{color:'white',fontSize:11,fontWeight:700}}>✓</span>}
                    </div>
                    <p style={{fontSize:13,color:checklist[i]?'#5a5a6a':'#c0c0cc',textDecoration:checklist[i]?'line-through':'none',transition:'all 0.15s'}}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            {assignment.draft && (
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:'#f0f0f2',marginBottom:2}}>Ready to paste into Canvas?</p>
                  <p style={{fontSize:12,color:'#5a5a6a'}}>Copy the draft and paste it into your submission portal</p>
                </div>
                <CopyBtn text={assignment.draft}/>
              </div>
            )}
            <Btn onClick={()=>run('mark-submitted')} loading={running==='mark-submitted'}
              disabled={Object.keys(checklist).filter(k=>checklist[k]).length<8||assignment.status==='submitted'}
              variant="success" style={{padding:'12px 24px',fontSize:14,justifyContent:'center'}}>
              {assignment.status==='submitted'?'✓ Already Submitted':'Mark as Submitted'}
            </Btn>
            {Object.keys(checklist).filter(k=>checklist[k]).length<8&&assignment.status!=='submitted'&&(
              <p style={{fontSize:12,color:'#5a5a6a',textAlign:'center',marginTop:-12}}>Complete all checklist items first</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Reminders() {
  const [reminders, setReminders] = useState([])
  useEffect(() => {
    fetch(`${API}/reminders`).then(r=>r.json()).then(setReminders).catch(()=>{})
  }, [])
  if (!reminders.length) return null
  return (
    <div style={{marginBottom:20,display:'grid',gap:8}}>
      {reminders.map(r=>(
        <div key={r.assignment_id} style={{
          background:r.urgency==='CRITICAL'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)',
          border:`1px solid ${r.urgency==='CRITICAL'?'rgba(239,68,68,0.2)':'rgba(245,158,11,0.2)'}`,
          borderRadius:12,padding:'12px 16px',display:'flex',gap:12,alignItems:'flex-start',
        }}>
          <span style={{fontSize:16,marginTop:1}}>{r.urgency==='CRITICAL'?'🚨':'⚠️'}</span>
          <div>
            <p style={{fontSize:13,fontWeight:600,color:'#f0f0f2',marginBottom:3}}>{r.title} — {r.hours_left}h left</p>
            <p style={{fontSize:12,color:'#9090a0',lineHeight:1.6}}>{r.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [assignments, setAssignments] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetch(`${API}/assignments`).then(r=>r.json())
      setAssignments(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function handleCreated(a) {
    setShowNew(false)
    setSelectedId(a.id)
    load()
  }

  function handleDeleted(id) {
    setDeleteTarget(null)
    if (selectedId === id) setSelectedId(null)
    load()
  }

  const selected = assignments.find(a => a.id === selectedId) || null

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:280,flexShrink:0,background:'#131316',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px 20px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
            <div style={{width:28,height:28,background:'linear-gradient(135deg,#7c6af7,#5b4fd4)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🎓</div>
            <h1 style={{fontSize:15,fontWeight:700,color:'#f0f0f2'}}>Assignment Agent</h1>
          </div>
          <p style={{fontSize:11,color:'#5a5a6a',paddingLeft:38}}>AI-powered co-pilot</p>
        </div>

        <div style={{padding:'12px 16px'}}>
          <button onClick={()=>setShowNew(true)} style={{
            width:'100%',background:'rgba(124,106,247,0.15)',border:'1px solid rgba(124,106,247,0.3)',
            borderRadius:10,padding:'10px 14px',color:'#a89af9',fontSize:13,fontWeight:600,
            display:'flex',alignItems:'center',gap:8,transition:'all 0.15s',cursor:'pointer',
          }}>
            <span style={{fontSize:16,lineHeight:1}}>+</span> New Assignment
          </button>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'4px 12px 16px'}}>
          {loading && <p style={{fontSize:13,color:'#5a5a6a',textAlign:'center',padding:20}}>Loading...</p>}
          {!loading&&!assignments.length&&(
            <div style={{textAlign:'center',padding:'40px 16px'}}>
              <p style={{fontSize:13,color:'#5a5a6a',lineHeight:1.6}}>No assignments yet.<br/>Click + to add one.</p>
            </div>
          )}
          {assignments.map(a=>(
            <SidebarItem key={a.id} a={a}
              selected={selectedId===a.id}
              onClick={a => setSelectedId(a.id)}
              onDelete={a => setDeleteTarget(a)}
            />
          ))}
        </div>

        <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p style={{fontSize:11,color:'#3a3a4a'}}>Powered by Ollama · Local & Free</p>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,overflowY:'auto',padding:28}}>
        <Reminders/>
        {selected ? (
          <DetailPanel key={selected.id} assignment={selected} onRefresh={load}/>
        ) : (
          <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>🎓</div>
              <h2 style={{fontSize:20,fontWeight:700,color:'#f0f0f2',marginBottom:8}}>Welcome to Assignment Agent</h2>
              <p style={{fontSize:14,color:'#5a5a6a',lineHeight:1.7,maxWidth:360}}>
                Your AI-powered academic co-pilot.<br/>Create an assignment and let the agents handle the rest.
              </p>
              <button onClick={()=>setShowNew(true)} style={{
                marginTop:24,background:'#7c6af7',color:'white',border:'none',
                borderRadius:12,padding:'12px 28px',fontSize:14,fontWeight:600,cursor:'pointer',
              }}>+ Create your first assignment</button>
            </div>
          </div>
        )}
      </div>

      <NewAssignmentModal open={showNew} onClose={()=>setShowNew(false)} onCreated={handleCreated}/>
      <DeleteConfirmModal open={!!deleteTarget} assignment={deleteTarget} onClose={()=>setDeleteTarget(null)} onDeleted={handleDeleted}/>
    </div>
  )
}