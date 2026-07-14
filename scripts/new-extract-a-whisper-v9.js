// v9 新 extractAWhisper 实现 — 由 patch-feeling-v9.js 读取并替换到云函数
// 升级点：兼容三种 feeling 结构
//   1) string（旧 distilledNvc.feeling 旧版本）
//   2) { feeling_text, highlight_words }（v9 新结构，A 端转译 + 提炼 + 微调 都用此结构）
//   3) { primary, secondary }（旧 desire.nvc.feeling 兼容回退）

function extractAWhisper(e){
  const n=e&&e.distilledNvc,t=e&&e.desire&&e.desire.nvc,r=e&&e.desire&&e.desire.text||"";
  const toFeelText=f=>{
    if(!f) return "";
    if(typeof f==="string") return f;
    if(typeof f==="object"){
      if(typeof f.feeling_text==="string") return f.feeling_text;
      if(f.primary) return f.primary+(f.secondary?"/"+f.secondary:"");
    }
    return "";
  };
  const s=n&&n.feeling?toFeelText(n.feeling):t&&t.feeling?toFeelText(t.feeling):"";
  return{desireText:r,observation:n&&n.observation||t&&t.observation||"",feeling:s,need:n&&n.need||t&&t.need||"",request:n&&n.request||t&&t.request||""}
}
