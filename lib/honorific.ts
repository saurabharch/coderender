// Honorific addressing from first names. Curated common Indian first names;
// unknown names fall back to bare first name (never guess a wrong title).
// Explicit user override ("call me Mrs. X", "I'm Mr. Y") always wins.
const MALE = new Set(
  "aarav,aditya,ajay,akash,aman,amit,anil,ankit,arjun,ashish,atul,deepak,dev,dinesh,farhan,gopal,harsh,imran,jay,jayesh,john,karan,kiran,kishore,krishna,kunal,mahesh,manish,mano,manoj,mohit,nakul,neeraj,nikhil,nitin,pankaj,pradeep,rahul,raj,rajeev,rajesh,rakesh,ram,ravi,rohan,rohit,sachin,sahil,samir,sandeep,sanjay,saurabh,sharma,shubham,subhash,sunil,suresh,varun,vikas,vikram,vinod,virat,vishal,yash".split(",")
);
const FEMALE = new Set(
  "aarti,ananya,anjali,ankita,asha,deepika,divya,farah,geeta,kavya,kiran,kirti,lakshmi,meera,neha,nisha,pooja,preeti,priya,radha,rekha,riya,roshni,shreya,sneha,sonia,sunita".split(",")
);

export interface Address {
  title: string;
  first: string;
  label: string;
}

export function parseTitleHint(text: string): string | null {
  const m = text.match(/\b(mrs?|ms|miss|smt|shri|sir|madam)\.?[\s.]+([a-z]+)/i);
  if (!m) return null;
  const t = m[1].toLowerCase();
  if (t === "mr" || t === "sir" || t === "shri") return "Mr.";
  if (t === "mrs" || t === "smt" || t === "madam") return "Mrs.";
  return "Ms.";
}

export function addressAs(fullName: string): Address {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { title: "", first: "friend", label: "friend" };
  const hint = parseTitleHint(fullName);
  const first = parts[0].replace(/[^a-zA-Z]/g, "") || "friend";
  const last = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-zA-Z]/g, "") : "";
  if (hint) return { title: hint, first, label: last ? `${hint} ${last}` : `${hint} ${first}` };
  const key = first.toLowerCase();
  if (MALE.has(key)) return { title: "Mr.", first, label: last ? `Mr. ${last}` : `Mr. ${first}` };
  if (FEMALE.has(key)) return { title: "Ms.", first, label: last ? `Ms. ${last}` : `Ms. ${first}` };
  return { title: "", first, label: first };
}

// Lead-name parsing (pure): pull a real human name out of the leftover text
// after phone/email extraction. Strips "my name is / i'm / call me" prefixes
// and filler words so "My name is Saurabh" → "Saurabh", never "My".
const NAME_PREFIX = /^(my names? (is|'s)?|i am|i'm|\bim\b|this is|here is|here'?s|call me|myself|it'?s)\b\s*/i;
const NAME_FILLER = new Set(
  "hi,hello,hey,ok,okay,yes,yeah,no,thanks,thank,you,dear,sir,madam,please,my,mine,me,i,im,am,is,the,a,an,and,here,there,number,phone,mobile,email,mail,contact,nope".split(",")
);

export function parseLeadName(rest: string): string {
  let s = rest.trim().slice(0, 80);
  if (!s) return "";
  // Peel greetings then intro prefixes (either order: "hi, i'm Rahul").
  for (let i = 0; i < 2; i++) {
    s = s.replace(/^(hi|hello|hey|ok|okay)[,.\s]+/i, "").trim();
    s = s.replace(NAME_PREFIX, "").trim();
  }
  const words = s.split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z.'-]/g, ""))
    .filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 2)
    .filter((w) => !NAME_FILLER.has(w.toLowerCase()))
    .slice(0, 3);
  const joined = words.join(" ").trim();
  if (joined.replace(/[^a-zA-Z]/g, "").length < 2) return "";
  return joined;
}

// Personalize: ensure the known name appears warmly; never double-add.
export function withName(text: string, label: string): string {
  if (!label || label === "friend") return text;
  const parts = label.replace(/^(Mr\.|Mrs\.|Ms\.)\s+/i, "").split(/\s+/).filter(Boolean);
  if (parts.some((p) => p.length > 1 && new RegExp(`\\b${p}\\b`, "i").test(text))) return text;
  return `${label}, ${text.charAt(0).toLowerCase() + text.slice(1)}`;
}
