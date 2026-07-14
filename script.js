/* ============================================================
   年轮 · Rings —— 交互逻辑
   维护：当前步骤、所选情绪、原始语料、所选渴望
   交互：
     第一步：情绪单选 → 解锁注入 → 滑动至第二步
     第二步：心晴动态渲染渴望选项 → 单选 → 解锁提炼真心话
            → 答题区淡出 → NVC 卡片打字机 → 生成破冰卡 → 滑入 B 端
     第三步：B端木门防火墙 → 分流（宣泄 / 直接看真心话）
     第四步：木偶替身宣泄 → 抖动 + 心晴代答 → NVC 重现 → 终点分流
            → 年轮终极生长发光
   ============================================================ */

(function () {
    "use strict";

    /* ---------- 状态 ---------- */
    const state = {
        step: 1,
        emotion: null,        // 第一步选中的情绪
        rawWords: "",         // 原始语料
        desire: null,         // 第二步选中的渴望 key
        distilled: false      // 是否已进入 NVC 转译视图
    };

    /* ---------- DOM 引用 ---------- */
    const wizard       = document.querySelector(".wizard");
    const emotions     = document.querySelectorAll(".emotion");
    const injectBtn    = document.getElementById("injectBtn");
    const backBtn      = document.getElementById("backBtn");
    const rawInput     = document.getElementById("rawWords");
    const rawEcho      = document.getElementById("rawEcho");
    const progressDots = document.querySelectorAll(".progress__dot");
    const steps        = document.querySelectorAll(".step");

    // 第二步
    const iceberg      = document.getElementById("iceberg");
    const optionsBox   = document.getElementById("options");
    const distillBtn   = document.getElementById("distillBtn");
    const nvcView      = document.getElementById("nvcView");
    const nvcFields    = document.querySelectorAll(".nvc-field");
    const nvcActions   = document.querySelector(".nvc-card__actions");
    const sendCardBtn  = document.getElementById("sendCardBtn");
    const saveLocalBtn = document.getElementById("saveLocalBtn");
    const toast        = document.getElementById("toast");

    // 第三步：B 端木门
    const stillAngryBtn = document.getElementById("stillAngryBtn");
    const calmDownBtn   = document.getElementById("calmDownBtn");
    const backBtn3      = document.getElementById("backBtn3");

    // 第四步：B 端木偶替身 + NVC 重现 + 终点
    const bStage        = document.getElementById("bStage");
    const puppet        = document.getElementById("puppet");
    const puppetInput   = document.getElementById("puppetInput");
    const pokeBtn       = document.getElementById("pokeBtn");
    const puppetReply   = document.getElementById("puppetReply");
    const revealBtn     = document.getElementById("revealBtn");
    const finaleView    = document.getElementById("finaleView");
    const finaleActions = document.querySelector(".finale__actions");
    const onlineChatBtn = document.getElementById("onlineChatBtn");
    const offlineChatBtn= document.getElementById("offlineChatBtn");
    const backBtn4      = document.getElementById("backBtn4");
    const finalGlow     = document.getElementById("finalGlow");

    // B 端 NVC 字段（复用打字机）
    const bNvcFields = finaleView.querySelectorAll(".nvc-field");

    /* ---------- Mock 数据：按情绪分组的渴望选项 ----------
       每个选项对应一组 NVC 的 need / request 转译结果。 */
    const DESIRE_MAP = {
        "委屈": [
            { key: "A", text: "渴望对方回家后能多陪陪我，而不是各自玩手机。",
              need: "我其实很需要和你建立有温度的连接，感受家的温暖。",
              request: "今晚我们能不能放下手机，抽出 15 分钟坐下来抱抱，聊聊彼此的一天？" },
            { key: "B", text: "渴望对方能看见我在家务中的付出，并对我说一句谢谢。",
              need: "我需要我的付出被看见、被认可，这让我感到自己是被在乎的。",
              request: "下次你回家时，能不能先给我一个拥抱，再说一句\"辛苦了\"？" },
            { key: "C", text: "渴望在做重大决定前，对方能先听听我的意见。",
              need: "我需要在这段关系里拥有平等的发言权，被当作重要的伙伴。",
              request: "以后家里有大事，我们能不能先坐下来一起商量再决定？" }
        ],
        "被忽略": [
            { key: "A", text: "渴望对方回家后能多陪陪我，而不是各自玩手机。",
              need: "我其实很需要和你建立有温度的连接，感受家的温暖。",
              request: "今晚我们能不能放下手机，抽出 15 分钟坐下来抱抱，聊聊彼此的一天？" },
            { key: "B", text: "渴望对方能看见我在家务中的付出，并对我说一句谢谢。",
              need: "我需要我的存在被你看见，而不是被当作理所当然的背景。",
              request: "能不能每天睡前，跟我说说今天让你记得我的一个小细节？" },
            { key: "C", text: "渴望在做重大决定前，对方能先听听我的意见。",
              need: "我需要在你心里被放在重要的位置，而不是被越过。",
              request: "下次做决定前，能不能先问我一句\"你怎么想\"？" }
        ],
        "愤怒": [
            { key: "A", text: "渴望对方在冲突时能先听我把话说完，而不是急着反驳。",
              need: "我需要我的情绪被接住，而不是被立刻顶回来。",
              request: "下次我们吵起来，能不能先让我说完三句话，你再回应？" },
            { key: "B", text: "渴望对方承认刚才那句话伤到我了，而不是说\"你想多了\"。",
              need: "我需要我的感受被认真对待，被承认是真实的。",
              request: "能不能请你跟我说一句\"我刚才那样说，确实不该\"？" },
            { key: "C", text: "渴望对方在生气时也不要用冷暴力把我推开。",
              need: "我需要即使在冲突里，我们之间也留一条通道，不被完全关在门外。",
              request: "以后再生气，能不能至少跟我说一句\"我需要冷静一下，不是不要你\"？" }
        ],
        "焦虑": [
            { key: "A", text: "渴望对方能主动告诉我他的计划，让我不用一直猜。",
              need: "我需要一些确定感，知道我们之间没有正在悄悄塌陷的地方。",
              request: "能不能每周抽个时间，跟我聊聊你接下来一周的安排？" },
            { key: "B", text: "渴望在我不安的时候，对方能先抱抱我，再讲道理。",
              need: "我需要先被身体接住，我的理智才肯慢慢回来。",
              request: "下次我开始胡思乱想时，能不能先抱我一会，再跟我说话？" },
            { key: "C", text: "渴望对方能跟我确认，我们在同一条船上。",
              need: "我需要反复听到\"我们是一伙的\"，焦虑才不会把我吞掉。",
              request: "能不能在我不安的时候，跟我说一句\"别怕，我在\"？" }
        ]
    };

    /* 副情绪搭配（用于 NVC 感受字段第二格） */
    const SECONDARY_EMOTION = {
        "委屈": "孤单",
        "被忽略": "委屈",
        "愤怒": "无力",
        "焦虑": "不安"
    };

    /* ---------- 初始化 ---------- */
    function init() {
        markCurrentStep(1);
        syncRawWords();
        bindEvents();
        spawnDust();
    }

    /* ---------- 事件绑定 ---------- */
    function bindEvents() {
        // 第一步：情绪单选
        emotions.forEach(card => {
            card.addEventListener("click", () => selectEmotion(card));
        });

        // 语料输入：实时同步
        rawInput.addEventListener("input", syncRawWords);

        // 注入年轮：进入第二步
        injectBtn.addEventListener("click", goToStep2);

        // 返回
        backBtn.addEventListener("click", goToStep1);

        // 提炼真心话
        distillBtn.addEventListener("click", distill);

        // 终点按钮：生成破冰卡 → 滑入 B 端木门
        sendCardBtn.addEventListener("click", goToStep3);
        saveLocalBtn.addEventListener("click", () => showToast("已悄悄存入本地年轮日记（Mock）"));

        // 第三步：B 端木门分流
        stillAngryBtn.addEventListener("click", () => goToStep4("puppet"));
        calmDownBtn.addEventListener("click",  () => goToStep4("finale"));
        backBtn3.addEventListener("click", goToStep2);

        // 第四步：木偶替身宣泄
        pokeBtn.addEventListener("click", pokePuppet);
        revealBtn.addEventListener("click", revealNvc);
        onlineChatBtn.addEventListener("click",  () => triggerFinale("online"));
        offlineChatBtn.addEventListener("click", () => triggerFinale("offline"));
        backBtn4.addEventListener("click", goToStep3);

        // 全局键盘：Enter 推进、Escape 返回
            document.addEventListener("keydown", (e) => {
                // 修复漏洞：textarea 内的 Enter 用于换行，不触发注入
                if (e.target === rawInput || e.target === puppetInput) return;

                if (e.key === "Enter") {
                    if (state.step === 1 && !injectBtn.disabled) goToStep2();
                    else if (state.step === 2 && !state.distilled && !distillBtn.disabled) distill();
                }
                if (e.key === "Escape") {
                    if (state.step === 4) goToStep3();
                    else if (state.step === 3) goToStep2();
                    else if (state.distilled) resetToQuiz();
                    else if (state.step === 2) goToStep1();
                }
            });
    }

    /* ---------- 第一步：情绪选择 ---------- */
    function selectEmotion(card) {
        const emotion = card.dataset.emotion;
        emotions.forEach(c => c.classList.remove("is-active"));
        card.classList.add("is-active");

        state.emotion = emotion;
        unlockCta();
    }

    function syncRawWords() {
        state.rawWords = rawInput.value.trim();
        rawEcho.textContent = "「" + (state.rawWords || "你总是把家当旅馆！") + "」";
        if (state.emotion) unlockCta();
    }

    function unlockCta() {
        if (state.emotion) {
            injectBtn.disabled = false;
            injectBtn.classList.add("is-ready");
        }
    }

    /* ---------- 步骤切换 ---------- */
    function goToStep2() {
        if (injectBtn.disabled) return;
        state.step = 2;
        wizard.setAttribute("data-step", "2");
        markCurrentStep(2);
        replayRingGrow(steps[1]);
        renderDesireOptions();
        // 重置第二步为答题视图（防止用户返回后再进）
        resetToQuiz();
    }

    function goToStep1() {
        state.step = 1;
        wizard.setAttribute("data-step", "1");
        markCurrentStep(1);
    }

    /* ---------- 第三步：B 端木门防火墙 ---------- */
    function goToStep3() {
        state.step = 3;
        wizard.setAttribute("data-step", "3");
        markCurrentStep(3);
        replayRingGrow(steps[2]);
    }

    /* ---------- 第四步：B 端木偶替身 / NVC 重现 ----------
       mode: "puppet" 走宣泄流程，"finale" 直接看真心话 */
    function goToStep4(mode) {
        state.step = 4;
        wizard.setAttribute("data-step", "4");
        markCurrentStep(4);
        replayRingGrow(steps[3]);

        // 重置 B 端舞台到初始视图
        bStage.classList.remove("is-revealed");
        finaleView.setAttribute("aria-hidden", "true");
        resetBFinale();

        if (mode === "finale") {
            // 冷静下来的用户：跳过木偶，直接滑出 NVC
            revealNvc();
        } else {
            // 还气着：进入木偶宣泄，重置木偶状态
            revealBtn.classList.remove("is-ready");
            revealBtn.disabled = true;
            puppetReply.classList.remove("is-show", "is-typing");
            puppetReply.textContent = "";
        }
    }

    /* ---------- 木偶替身：挨揍抖动 + 心晴代答 ---------- */
    function pokePuppet() {
        // 抖动动画
        puppet.classList.remove("is-shaking");
        void puppet.offsetWidth;
        puppet.classList.add("is-shaking");

        // 心晴代木偶回复（打字机）
        const reply = "对不起对不起！当时我（A）脑子进水了，主人别生气了，我已经替你狠狠教训 Ta 了！";
        typeInto(puppetReply, reply, 38, () => {
            // 打完后解锁"去看真心话"按钮
            revealBtn.classList.add("is-ready");
            revealBtn.disabled = false;
        });
    }

    /* ---------- 切换到 NVC 重现视图 + B 端打字机 ---------- */
    function revealNvc() {
        bStage.classList.add("is-revealed");
        finaleView.setAttribute("aria-hidden", "false");
        setTimeout(typeBFinale, 350);
    }

    async function typeBFinale() {
        const desire = state.desire;
        const primary = state.emotion || "委屈";
        const secondary = SECONDARY_EMOTION[primary] || "孤单";

        const fields = [
            {
                el: document.getElementById("bNvcObservation"),
                tokens: [{ type: "text", value: "最近你经常很晚回家，并且一进门就进房间反锁了门。" }]
            },
            {
                el: document.getElementById("bNvcFeeling"),
                tokens: [
                    { type: "text", value: "我觉得有些 " },
                    { type: "tag",  value: primary },
                    { type: "text", value: " 和 " },
                    { type: "tag",  value: secondary },
                    { type: "text", value: "。" }
                ]
            },
            {
                el: document.getElementById("bNvcNeed"),
                tokens: [{ type: "text", value: desire.need }]
            },
            {
                el: document.getElementById("bNvcRequest"),
                tokens: [{ type: "text", value: desire.request }]
            }
        ];

        for (const field of fields) {
            await typeField(field.el, field.tokens, 38, 240);
        }
        finaleActions.classList.add("is-visible");
    }

    function resetBFinale() {
        bNvcFields.forEach(f => {
            f.classList.remove("is-visible", "is-typing");
            f.querySelector(".nvc-field__text").innerHTML = "";
        });
        finaleActions.classList.remove("is-visible");
    }

    /* ---------- 终点分流：年轮终极生长发光 ---------- */
    function triggerFinale(type) {
        wizard.classList.add("is-finale");
        finalGlow.classList.add("is-on");
        if (type === "online") {
            showToast("心晴已就位，将为你们的对话解读情绪线索");
        } else {
            showToast("和解信号已发出，A 的手机里有一盏温暖的灯正在亮起");
        }
    }

    function markCurrentStep(n) {
        progressDots.forEach(dot => {
            const s = parseInt(dot.dataset.step, 10);
            dot.classList.toggle("progress__dot--active", s === n);
        });
        steps.forEach(step => step.classList.remove("is-current"));
        const target = document.querySelector(`.step--${n}`);
        if (target) target.classList.add("is-current");
    }

    function replayRingGrow(stepEl) {
        const rings = stepEl.querySelectorAll(".ring");
        rings.forEach(r => {
            r.style.animation = "none";
            void r.offsetWidth;
            r.style.animation = "";
        });
        stepEl.classList.add("is-current");
    }

    /* ---------- 第二步：动态渲染渴望选项 ---------- */
    function renderDesireOptions() {
        const list = DESIRE_MAP[state.emotion] || DESIRE_MAP["委屈"];
        optionsBox.innerHTML = "";
        list.forEach(opt => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "option";
            btn.dataset.key = opt.key;
            btn.textContent = opt.text;
            btn.addEventListener("click", () => selectDesire(btn, opt));
            optionsBox.appendChild(btn);
        });
        // 重置按钮
        distillBtn.disabled = true;
        distillBtn.classList.remove("is-ready");
        state.desire = null;
    }

    function selectDesire(btn, opt) {
        optionsBox.querySelectorAll(".option").forEach(o => o.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.desire = opt;
        distillBtn.disabled = false;
        distillBtn.classList.add("is-ready");
    }

    /* ---------- 提炼真心话：切换到 NVC 视图 + 打字机 ---------- */
    function distill() {
        if (distillBtn.disabled || state.distilled) return;
        state.distilled = true;
        iceberg.classList.add("is-distilled");
        nvcView.setAttribute("aria-hidden", "false");
        // 等待淡入后启动打字机
        setTimeout(typeNvcCard, 350);
    }

    function resetToQuiz() {
        state.distilled = false;
        iceberg.classList.remove("is-distilled");
        nvcView.setAttribute("aria-hidden", "true");
        // 清空打字机残留
        nvcFields.forEach(f => {
            f.classList.remove("is-visible", "is-typing");
            f.querySelector(".nvc-field__text").innerHTML = "";
        });
        nvcActions.classList.remove("is-visible");
    }

    /* ---------- NVC 打字机渲染 ----------
       字段顺序：observation → feeling → need → request
       feeling 字段里 {emotion}/{second} 占位符渲染为高亮标签。 */
    async function typeNvcCard() {
        const desire = state.desire;
        const primary = state.emotion || "委屈";
        const secondary = SECONDARY_EMOTION[primary] || "孤单";

        // 预处理四个字段为 tokens
        const fields = [
            {
                el: document.getElementById("nvcObservation"),
                tokens: [{ type: "text", value: "最近你经常很晚回家，并且一进门就进房间反锁了门。" }]
            },
            {
                el: document.getElementById("nvcFeeling"),
                tokens: [
                    { type: "text", value: "我觉得有些 " },
                    { type: "tag",  value: primary },
                    { type: "text", value: " 和 " },
                    { type: "tag",  value: secondary },
                    { type: "text", value: "。" }
                ]
            },
            {
                el: document.getElementById("nvcNeed"),
                tokens: [{ type: "text", value: desire.need }]
            },
            {
                el: document.getElementById("nvcRequest"),
                tokens: [{ type: "text", value: desire.request }]
            }
        ];

        for (const field of fields) {
            await typeField(field.el, field.tokens, 38, 240);
        }

        // 全部打完，浮现终点按钮
        nvcActions.classList.add("is-visible");
    }

    /* 单字段打字：先浮现容器，再逐 token 渲染
       el 是 .nvc-field__text 文本节点本身，父容器 .nvc-field 负责动画 class */
    function typeField(el, tokens, charDelay, fieldGap) {
        return new Promise(resolve => {
            const fieldEl = el.closest(".nvc-field");
            fieldEl.classList.add("is-visible", "is-typing");
            el.innerHTML = "";
            let i = 0;

            function nextToken() {
                if (i >= tokens.length) {
                    fieldEl.classList.remove("is-typing");
                    setTimeout(resolve, fieldGap);
                    return;
                }
                const tk = tokens[i++];
                if (tk.type === "tag") {
                    const span = document.createElement("span");
                    span.className = "emotion-tag";
                    span.textContent = tk.value;
                    el.appendChild(span);
                    setTimeout(nextToken, 120);
                } else {
                    typeText(el, tk.value, charDelay, nextToken);
                }
            }
            nextToken();
        });
    }

    function typeText(container, str, charDelay, done) {
        let idx = 0;
        (function tick() {
            if (idx >= str.length) { done(); return; }
            container.appendChild(document.createTextNode(str[idx++]));
            setTimeout(tick, charDelay);
        })();
    }

    /* 通用打字机：直接对单个容器打字（用于木偶回复，无 token 分段） */
    function typeInto(container, str, charDelay, done) {
        container.classList.add("is-show", "is-typing");
        container.textContent = "";
        let idx = 0;
        (function tick() {
            if (idx >= str.length) {
                container.classList.remove("is-typing");
                if (done) done();
                return;
            }
            container.textContent += str[idx++];
            setTimeout(tick, charDelay);
        })();
    }

    /* ---------- Mock 轻提示 ---------- */
    let toastTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("is-show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("is-show"), 2600);
    }

    /* ---------- 漂浮微尘 ---------- */
    function spawnDust() {
        const dust = document.getElementById("dust");
        if (!dust) return;
        const count = 14;
        for (let i = 0; i < count; i++) {
            const s = document.createElement("span");
            s.style.left = Math.random() * 100 + "%";
            s.style.animationDuration = (12 + Math.random() * 10) + "s";
            s.style.animationDelay = (-Math.random() * 20) + "s";
            const scale = 0.5 + Math.random() * 1.2;
            s.style.transform = `scale(${scale})`;
            dust.appendChild(s);
        }
    }

    /* ---------- 启动 ---------- */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
