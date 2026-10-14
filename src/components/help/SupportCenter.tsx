import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";
import {
  CATEGORY_LABELS, STATUS_LABELS, getTickets, createTicket, getTicketMessages,
  replyToTicket, adminUpdateTicket, getTicketEvents,
  type TicketCategory, type TicketPriority, type TicketStatus, type SupportTicket,
  type TicketMessage, type TicketEvent,
} from "@/services/supportTickets";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TicketCategory[];
const STATUSES = Object.keys(STATUS_LABELS) as TicketStatus[];
const Pill = ({ label, selected, onPress }: {label:string;selected:boolean;onPress:()=>void}) => (
  <Pressable accessibilityRole="button" accessibilityState={{selected}}
    style={[styles.pill,selected&&styles.activePill]} onPress={onPress}>
    <Text style={[styles.pillText,selected&&styles.activePillText]}>{label}</Text>
  </Pressable>
);

export function SupportCenter({forAdmin=false}: {forAdmin?:boolean}) {
  const {profile}=useAuth();
  const [tickets,setTickets]=useState<SupportTicket[]>([]);
  const [selected,setSelected]=useState<SupportTicket|null>(null);
  const [messages,setMessages]=useState<TicketMessage[]>([]);
  const [events,setEvents]=useState<TicketEvent[]>([]);
  const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [subject,setSubject]=useState("");
  const [category,setCategory]=useState<TicketCategory>("shift_hours");
  const [details,setDetails]=useState("");
  const [reply,setReply]=useState("");
  const [status,setStatus]=useState<TicketStatus>("open");
  const [priority,setPriority]=useState<TicketPriority>("normal");
  const [adminNote,setAdminNote]=useState("");
  const [showNew,setShowNew]=useState(false);

  const refresh=useCallback(async()=>{
    try{
      setError("");
      const list=await getTickets();
      setTickets(list);
      if(selected){
        const active=list.find(x=>x.id===selected.id);
        if(active){
          setSelected(active);
          const [msg,history]=await Promise.all([
            getTicketMessages(active.id),forAdmin?getTicketEvents(active.id):Promise.resolve([]),
          ]);
          setMessages(msg);setEvents(history);
        }else {setSelected(null);setMessages([]);setEvents([]);}
      }
    }catch(e){setError(e instanceof Error?e.message:"Support could not load.");}
    finally{setLoading(false);}
  },[selected?.id,forAdmin]);

  useEffect(()=>{void refresh();},[refresh]);
  const open=async(ticket:SupportTicket)=>{
    setSelected(ticket);setStatus(ticket.status);setPriority(ticket.priority);
    setError("");setLoading(true);
    try{
      const [msg,history]=await Promise.all([
        getTicketMessages(ticket.id),forAdmin?getTicketEvents(ticket.id):Promise.resolve([]),
      ]);
      setMessages(msg);setEvents(history);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load messages.");}
    finally{setLoading(false);}
  };
  const create=async()=>{
    if(subject.trim().length<5||details.trim().length<10){
      setError("Use a subject of at least 5 characters and describe the issue in at least 10 characters.");
      return;
    }
    setBusy(true);setError("");
    try{
      const result=await createTicket({subject,category,message:details});
      if(!result.ok){setError(result.message);return;}
      setSubject("");setDetails("");setShowNew(false);
      await refresh();await open(result.ticket);
    }finally{setBusy(false);}
  };
  const sendReply=async()=>{
    if(!selected||reply.trim().length<2)return;
    setBusy(true);setError("");
    try{
      const result=await replyToTicket(selected.id,reply);
      if(!result.ok){setError(result.message);return;}
      setReply("");await refresh();
    }finally{setBusy(false);}
  };
  const saveStatus=()=>{
    if(!selected||adminNote.trim().length<10){setError("Enter at least 10 characters explaining this case decision.");return;}
    Alert.alert("Update support case",`Set this case to ${STATUS_LABELS[status]} (${priority} priority)? The change will be audited.`,[
      {text:"Cancel",style:"cancel"},
      {text:"Update",onPress:()=>{void(async()=>{
        setBusy(true);setError("");
        try{
          const r=await adminUpdateTicket({id:selected.id,status,priority,note:adminNote});
          if(!r.ok){setError(r.message);return;}
          setAdminNote("");await refresh();
        }finally{setBusy(false);}
      })();}},
    ]);
  };
  return (
    <ScreenContainer refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
      <Text style={styles.header}>{forAdmin?"Administrator Support Desk":"Help & Support"}</Text>
      <Text style={styles.hint}>{forAdmin
        ?"Respond to driver issues, document resolutions, and track case history. Sensitive location and payroll information should stay in authorized systems."
        :"Report wrong hours, GPS issues or sign-in problems to your First Choice administrator. Do not include passwords or other people’s private information."}</Text>
      {error ? <Text style={styles.error}>{error}</Text>:null}
      {loading ? <ActivityIndicator/>:null}
      {selected ? (
        <>
          <Pressable onPress={()=>{setSelected(null);setMessages([]);setError("");}}
            style={styles.back}><Text style={styles.link}>← All support cases</Text></Pressable>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{selected.subject}</Text>
            <Text style={styles.hint}>{CATEGORY_LABELS[selected.category]} · {STATUS_LABELS[selected.status]} · {selected.priority}</Text>
            <Text style={styles.hint}>Case opened: {new Date(selected.created_at).toLocaleString()}</Text>
          </View>
          <Text style={styles.section}>Conversation</Text>
          {messages.map(m=><View key={m.id} style={styles.card}>
            <Text style={styles.sender}>{m.author_id===profile?.id?"You":forAdmin?"Driver/team member":"First Choice support"}</Text>
            <Text style={styles.body}>{m.body}</Text>
            <Text style={styles.hint}>{new Date(m.created_at).toLocaleString()}</Text>
          </View>)}
          {selected.status!=="closed" ? <>
            <Text style={styles.section}>Reply</Text>
            <TextInput value={reply} onChangeText={setReply} multiline maxLength={3000}
              accessibilityLabel="Support reply" placeholder="Explain what happened or what help you need..."
              placeholderTextColor="#64748b" style={[styles.input,styles.textarea]}/>
            <Pressable style={styles.button} disabled={busy||reply.trim().length<2} onPress={()=>void sendReply()}>
              <Text style={styles.buttonText}>Send message</Text>
            </Pressable>
          </>:<Text style={styles.hint}>This case is closed. Create a new ticket to request more help.</Text>}
          {forAdmin ? <>
            <Text style={styles.section}>Administrator case management</Text>
            <Text style={styles.field}>Status</Text>
            <View style={styles.choices}>{STATUSES.map(s=><Pill key={s} selected={s===status}
              label={STATUS_LABELS[s]} onPress={()=>setStatus(s)}/>)}</View>
            <Text style={styles.field}>Priority</Text>
            <View style={styles.choices}>{(["normal","high"] as TicketPriority[]).map(p=><Pill key={p}
              selected={p===priority} label={p} onPress={()=>setPriority(p)}/>)}</View>
            <TextInput value={adminNote} onChangeText={setAdminNote} multiline
              placeholder="Reason for changing status or priority"
              accessibilityLabel="Administrator case note" placeholderTextColor="#64748b"
              style={[styles.input,styles.textarea]}/>
            <Pressable style={styles.button} disabled={busy} onPress={saveStatus}>
              <Text style={styles.buttonText}>Save audited decision</Text>
            </Pressable>
            <Text style={styles.section}>Administrator audit history</Text>
            {events.map(e=><View key={e.id} style={styles.card}>
              <Text style={styles.body}>{e.from_status||"Created"} → {e.to_status}</Text>
              <Text style={styles.hint}>{e.note||"No note"} · {new Date(e.created_at).toLocaleString()}</Text>
            </View>)}
          </>:null}
        </>
      ) : (
        <>
          <Pressable style={styles.button} onPress={()=>setShowNew(v=>!v)}>
            <Text style={styles.buttonText}>{showNew?"Hide new request":"Open a support request"}</Text>
          </Pressable>
          {showNew ? <View style={styles.card}>
            <Text style={styles.field}>What's the issue?</Text>
            <View style={styles.choices}>{CATEGORIES.map(c=><Pill key={c} label={CATEGORY_LABELS[c]}
              selected={c===category} onPress={()=>setCategory(c)}/>)}</View>
            <Text style={styles.field}>Subject</Text>
            <TextInput value={subject} maxLength={120} onChangeText={setSubject}
              accessibilityLabel="Support subject" style={styles.input} placeholder="Brief issue title"
              placeholderTextColor="#64748b"/>
            <Text style={styles.field}>Explain what you need</Text>
            <TextInput value={details} maxLength={3000} multiline onChangeText={setDetails}
              accessibilityLabel="Support details" style={[styles.input,styles.textarea]}
              placeholder="When did it happen? What should have happened instead?"
              placeholderTextColor="#64748b"/>
            <Pressable style={styles.button} disabled={busy} onPress={()=>void create()}>
              <Text style={styles.buttonText}>Submit support request</Text>
            </Pressable>
          </View>:null}
          <Text style={styles.section}>{forAdmin?"Company cases":"Your requests"}</Text>
          {!tickets.length&&!loading&&<Text style={styles.hint}>No support requests yet.</Text>}
          {tickets.map(t=><Pressable key={t.id} style={styles.card} onPress={()=>void open(t)}>
            <Text style={styles.cardTitle}>{t.subject}</Text>
            <Text style={styles.hint}>{CATEGORY_LABELS[t.category]} · {STATUS_LABELS[t.status]} · {t.priority}</Text>
            <Text style={styles.link}>Open conversation →</Text>
          </Pressable>)}
        </>
      )}
    </ScreenContainer>
  );
}
const styles=StyleSheet.create({
 header:{fontSize:23,fontWeight:"700",color:"#0f172a",marginBottom:10},
 section:{fontSize:18,fontWeight:"700",color:"#1e293b",marginTop:20,marginBottom:10},
 field:{fontSize:14,fontWeight:"600",color:"#334155",marginTop:8},
 hint:{fontSize:13,color:"#64748b",lineHeight:19,marginBottom:8},
 error:{padding:10,color:"#b91c1c",backgroundColor:"#fef2f2",borderRadius:8,marginBottom:12},
 card:{padding:15,borderRadius:12,borderWidth:1,borderColor:"#e2e8f0",backgroundColor:"#f8fafc",marginVertical:6,gap:6},
 cardTitle:{color:"#0f172a",fontWeight:"700",fontSize:16},
 body:{fontSize:14,lineHeight:21,color:"#334155"},
 sender:{fontSize:13,fontWeight:"700",color:"#1d4ed8"},
 link:{fontSize:14,fontWeight:"600",color:"#295fed"},
 input:{borderWidth:1,borderColor:"#cbd5e1",borderRadius:9,padding:12,fontSize:15,color:"#0f172a",backgroundColor:"#fff"},
 textarea:{minHeight:110,textAlignVertical:"top"},
 button:{marginVertical:8,backgroundColor:"#315eea",borderRadius:10,padding:14,alignItems:"center"},
 buttonText:{color:"#fff",fontWeight:"700",fontSize:15},
 back:{paddingVertical:12},
 choices:{flexDirection:"row",gap:8,flexWrap:"wrap",marginVertical:7},
 pill:{paddingHorizontal:12,paddingVertical:9,backgroundColor:"#f1f5f9",borderRadius:18,borderWidth:1,borderColor:"#cbd5e1"},
 activePill:{backgroundColor:"#285bed",borderColor:"#285bed"},
 pillText:{fontSize:13,color:"#334155"},
 activePillText:{color:"#fff",fontWeight:"700"},
});
