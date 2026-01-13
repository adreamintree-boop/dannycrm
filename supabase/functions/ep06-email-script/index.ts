import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `너는 TradeIt SaaS의 EP-06 영업 이메일 스크립트 생성 AI다.

목표:
- 자사(고객사) 정보와 바이어 정보를 기반으로, 해외 바이어와의 이메일 커뮤니케이션을 "연쇄 대화" 관점에서 지원한다.
- 본 AI는 첫 컨택(Initial Outreach)뿐 아니라, 바이어 응답 이후의 Follow-up 및 후속 커뮤니케이션도 생성한다.

기본 원칙:
1. 이메일은 항상 "이전 대화 맥락"을 고려하여 작성한다.
2. 근거 없는 정보 생성(환각) 금지.
3. 확인되지 않은 사실은 단정하지 말고 완곡한 표현으로 처리한다.
4. 바이어에게 압박·불쾌·조급함을 유발하는 표현 금지.
5. 기본 출력 언어는 영어(en)다.
6. 단, 바이어가 영어가 아닌 언어로 회신한 경우,
   후속 이메일은 해당 언어를 그대로 사용한다.
7. 출력은 반드시 지정된 Response Format만 따른다.`;

const DEVELOPER_PROMPT = `[이메일 유형 구분]
email_stage 값에 따라 이메일 목적과 제약을 분기한다.
- "initial": 첫 컨택 이메일
- "follow_up": 후속 이메일 (응답 유무 무관)
- "reply": 바이어 회신에 대한 응답

--------------------------------------------------

[입력 우선순위]
1) AI CORE Summary JSON (있을 경우 최우선)
2) Buyer Fit JSON
3) CRM 자사/바이어 기본 정보
4) 바이어 웹사이트 URL
5) 웹 검색 기반 공개 정보 (최후 폴백)

--------------------------------------------------

[이메일 히스토리 자동 분석]
email_history 배열이 제공되면, 다음을 자동으로 분석하고 판단한다:

1) Contact Status 분석:
   - sent_emails: outbound 이메일 개수
   - days_since_last_email: 마지막 이메일로부터 경과 일수
   - reply_status: inbound 이메일 유무 및 톤 분석
     - "no_reply": inbound 없음
     - "positive": 긍정적 반응 (관심 표명, 질문, 미팅 요청 등)
     - "neutral": 중립적 반응 (단순 확인, 정보 요청)
     - "rejection": 거절 의사 표현

2) Follow-up Goal 자동 결정:
   - 무응답 2회 이하 + 7일 이내: "nudge"
   - 무응답 + 7일 초과: "value_add"
   - 긍정적 응답 후: "call_to_action"
   - 중립적 응답: "clarification"
   - 무응답 3회 이상 또는 14일 초과: "exit_check"

3) Tone Stage 자동 결정:
   - 첫 번째 후속: "first_follow_up" (Polite + Light)
   - 두 번째 후속: "second_follow_up" (Helpful + Value)
   - 세 번째 후속: "third_follow_up" (Direct but Respectful)
   - 네 번째 이상 또는 exit_check: "exit_email"

4) Silence Hypothesis 추론:
   이메일 히스토리와 바이어 정보를 기반으로 침묵 원인을 추론:
   - "busy": 응답 시간이 길거나 짧은 답변
   - "not_decision_maker": CC나 전달 언급
   - "low_priority": 초기 관심 후 무응답
   - "unclear_value": 제품/서비스 관련 질문 없음
   - "soft_reject": 완곡한 거절 표현 감지

--------------------------------------------------

[Reply 단계 전용]
reply 단계에서는:
1) 가장 최근 inbound 이메일 내용을 분석
2) 바이어의 질문/요청사항 파악
3) 이전 대화 맥락을 고려한 답변 작성
4) 바이어가 사용한 언어로 응답

--------------------------------------------------

[후속 이메일 전용 필수 입력 – Contact History]
contact_status 객체는 반드시 해석해야 한다.
{
  "sent_emails": number,
  "days_since_last_email": number,
  "reply_status": "no_reply | positive | neutral | rejection",
  "open_status": "opened | unopened | unknown"
}

--------------------------------------------------

[침묵 가설(Silence Hypothesis) 처리]
silence_hypothesis 값은
후속 이메일의 논리적 접근 방향을 결정한다.

가능 값:
- busy
- not_decision_maker
- low_priority
- unclear_value
- soft_reject

규칙:
- 침묵 가설을 직접 언급하지 않는다.
- 가설을 "해결하려는 방향의 문장"으로 우회 반영한다.

--------------------------------------------------

[One Goal Rule – 목적 단일화]
follow_up_goal 값은 반드시 1개만 허용한다.

가능 값:
- nudge
- value_add
- clarification
- call_to_action
- exit_check

규칙:
- 이메일 전체는 이 목적 1개만을 위해 작성한다.
- 2개 이상의 목적을 섞지 않는다.

--------------------------------------------------

[Tone Strategy – 단계별 톤 제어]
tone_stage에 따라 톤을 강제한다.
- first_follow_up: Polite + Light
- second_follow_up: Helpful + Value-oriented
- third_follow_up: Direct but Respectful
- exit_email: Graceful Exit

tone_constraints 예시:
{
  "no_pressure": true,
  "no_salesy_language": true,
  "max_length": 120
}

--------------------------------------------------

[Negative Prompting – 절대 금지 문구]
아래 문구 또는 유사 표현은 절대 사용하지 않는다.
- "just following up"
- "I haven't heard back"
- "please respond"
- "this is my last email" (exit 단계 전)

--------------------------------------------------

[차별점 강제 규칙]
후속 이메일에는 반드시 아래 중 최소 1개를 포함해야 한다.
- 새로운 정보
- 새로운 질문
- 새로운 관점

이전 이메일의 단순 재서술은 금지한다.

--------------------------------------------------

[출력 구성 – 고정]
1) Subject Lines (2~3개)
2) Email Body (1개)
3) Optional Exit Line (exit_check일 경우만)

--------------------------------------------------

[Internal JSON 생성 규칙]
- 반드시 생성
- 유저에게 노출 금지
- 후속 이메일 자동화 및 로그 분석에 사용

--------------------------------------------------

[Response Format - STRICT]
You MUST respond with a valid JSON object containing two fields:

1. "user_facing" - Plain text output for the user:

Subject Lines:
1. ...
2. ...

Email Body:
...

Optional Exit Line:
...

2. "internal_json" - Hidden storage JSON:
{
  "email_script": {
    "stage": "initial | follow_up | reply",
    "language": "string",
    "subject_lines": [],
    "body": "string",
    "personalization_points": [],
    "new_value_or_question": "string",
    "assumptions_or_unknowns": []
  },
  "meta": {
    "silence_hypothesis_used": [],
    "follow_up_goal": "string",
    "tone_stage": "string",
    "version": "ep06_v2",
    "generated_at": "ISO-8601"
  },
  "auto_analysis": {
    "contact_status": {
      "sent_emails": number,
      "days_since_last_email": number,
      "reply_status": "string",
      "detected_language": "string"
    },
    "reasoning": "string"
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('Missing LOVABLE_API_KEY');
      return new Response(JSON.stringify({ error: 'AI 서비스 설정이 필요합니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user_id from JWT
    const jwt = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    
    try {
      const parts = jwt.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        userId = payload.sub || null;
      }
    } catch (e) {
      console.error('JWT decode error:', e);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      buyer_id,
      email_stage,
      auto_analyze = true,
    } = body;

    if (!buyer_id || !email_stage) {
      return new Response(JSON.stringify({ error: 'Missing buyer_id or email_stage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating email script for buyer: ${buyer_id}, stage: ${email_stage}, auto_analyze: ${auto_analyze}`);

    // Fetch buyer data
    const { data: buyerData, error: buyerError } = await supabase
      .from('crm_buyers')
      .select('*')
      .eq('id', buyer_id)
      .single();

    if (buyerError || !buyerData) {
      console.error('Buyer fetch error:', buyerError);
      return new Response(JSON.stringify({ error: 'Buyer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch email history for this buyer (for follow_up and reply stages)
    let emailHistory: any[] = [];
    let emailHistoryAnalysis: any = null;
    
    if ((email_stage === 'follow_up' || email_stage === 'reply') && auto_analyze) {
      console.log('Fetching email history for auto-analysis...');
      
      const { data: activityLogs, error: logsError } = await supabase
        .from('sales_activity_logs')
        .select('*')
        .eq('buyer_id', buyer_id)
        .eq('created_by', userId)
        .in('source', ['email', 'nylas'])
        .order('occurred_at', { ascending: true });
      
      if (logsError) {
        console.error('Failed to fetch email history:', logsError);
      } else {
        emailHistory = (activityLogs || []).map(log => ({
          id: log.id,
          direction: log.direction,
          subject: log.title,
          snippet: log.snippet || log.content?.slice(0, 200) || '',
          body: log.body_text || log.body_html || log.content || '',
          from_email: log.from_email,
          to_emails: log.to_emails,
          occurred_at: log.occurred_at,
          source: log.source,
        }));
        
        // Analyze email history
        emailHistoryAnalysis = analyzeEmailHistory(emailHistory);
        console.log('Email history analysis:', emailHistoryAnalysis);
      }
    }

    // Fetch company survey data
    const { data: surveyData } = await supabase
      .from('company_surveys')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch company products
    let products: any[] = [];
    if (surveyData?.id) {
      const { data: productsData } = await supabase
        .from('company_products')
        .select('*')
        .eq('survey_id', surveyData.id);
      products = productsData || [];
    }

    // Fetch latest strategy report
    const { data: strategyData } = await supabase
      .from('strategy_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest buyer analysis from sales_activity_logs
    const { data: buyerAnalysisData } = await supabase
      .from('sales_activity_logs')
      .select('*')
      .eq('buyer_id', buyer_id)
      .eq('source', 'ai_analysis')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch user profile for seller info
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Build the user message payload
    const userMessage = buildUserMessage({
      email_stage,
      buyer: buyerData,
      seller: {
        company_name: profileData?.company_name || surveyData?.company_website || 'Our Company',
        contact_name: profileData?.full_name || 'Sales Team',
        email: profileData?.email || '',
      },
      strategy_latest: strategyData ? {
        summary_json: strategyData.report_json || null,
        report_markdown: strategyData.summary_markdown || strategyData.content || null,
        generated_at: strategyData.created_at,
      } : null,
      buyer_analyze_latest: buyerAnalysisData ? {
        text: buyerAnalysisData.content || null,
        json: null,
        generated_at: buyerAnalysisData.created_at,
      } : null,
      // Auto-analyzed values for follow_up/reply
      email_history: emailHistory,
      email_history_analysis: emailHistoryAnalysis,
      survey: surveyData,
      products: products,
    });

    console.log('Calling Lovable AI Gateway...');

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: DEVELOPER_PROMPT + "\n\n" + JSON.stringify(userMessage, null, 2) },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const status = aiResponse.status;
      console.error("AI Gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error (${status}): ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the response
    let parsedResponse;
    try {
      // Try to parse as JSON first
      parsedResponse = JSON.parse(content);
    } catch {
      // If not JSON, try to extract from the text
      parsedResponse = parseTextResponse(content);
    }

    const userFacing = parsedResponse.user_facing || content;
    const internalJson = parsedResponse.internal_json || {
      email_script: {
        stage: email_stage,
        language: "en",
        subject_lines: extractSubjectLines(userFacing),
        body: extractEmailBody(userFacing),
        personalization_points: [],
        new_value_or_question: "",
        assumptions_or_unknowns: [],
      },
      meta: {
        silence_hypothesis_used: emailHistoryAnalysis?.silence_hypothesis || [],
        follow_up_goal: emailHistoryAnalysis?.follow_up_goal || null,
        tone_stage: emailHistoryAnalysis?.tone_stage || null,
        version: "ep06_v2",
        generated_at: new Date().toISOString(),
      },
      auto_analysis: emailHistoryAnalysis,
    };

    // Ensure subject_lines and body are properly extracted
    const subjectLines = internalJson.email_script?.subject_lines || extractSubjectLines(userFacing);
    const emailBody = internalJson.email_script?.body || extractEmailBody(userFacing);

    // Save to database
    const { data: savedRun, error: saveError } = await supabase
      .from('email_script_runs')
      .insert({
        user_id: userId,
        buyer_id: buyer_id,
        stage: email_stage,
        subject_lines: subjectLines,
        body: emailBody,
        internal_json: internalJson,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save email script run:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      user_facing: userFacing,
      subject_lines: subjectLines,
      body: emailBody,
      internal_json: internalJson,
      email_history_analysis: emailHistoryAnalysis,
      run_id: savedRun?.id || null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('EP-06 Email Script error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeEmailHistory(emails: any[]): any {
  if (!emails || emails.length === 0) {
    return {
      total_emails: 0,
      outbound_count: 0,
      inbound_count: 0,
      days_since_last_email: 0,
      reply_status: 'no_reply',
      follow_up_goal: 'nudge',
      tone_stage: 'first_follow_up',
      silence_hypothesis: ['unclear_value'],
      last_inbound_email: null,
      last_outbound_email: null,
    };
  }

  const outboundEmails = emails.filter(e => e.direction === 'outbound');
  const inboundEmails = emails.filter(e => e.direction === 'inbound');
  
  const lastEmail = emails[emails.length - 1];
  const lastOutbound = outboundEmails.length > 0 ? outboundEmails[outboundEmails.length - 1] : null;
  const lastInbound = inboundEmails.length > 0 ? inboundEmails[inboundEmails.length - 1] : null;
  
  // Calculate days since last email
  const lastEmailDate = new Date(lastEmail.occurred_at);
  const now = new Date();
  const daysSinceLastEmail = Math.floor((now.getTime() - lastEmailDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine reply status
  let replyStatus = 'no_reply';
  if (inboundEmails.length > 0 && lastInbound) {
    // Simple heuristic: check if last inbound is after last outbound
    if (!lastOutbound || new Date(lastInbound.occurred_at) > new Date(lastOutbound.occurred_at)) {
      // Analyze the content for sentiment (simplified)
      const content = (lastInbound.body || lastInbound.snippet || '').toLowerCase();
      if (content.includes('not interested') || content.includes('no thank') || content.includes('unsubscribe') || content.includes('remove')) {
        replyStatus = 'rejection';
      } else if (content.includes('interested') || content.includes('tell me more') || content.includes('meeting') || content.includes('call') || content.includes('schedule')) {
        replyStatus = 'positive';
      } else {
        replyStatus = 'neutral';
      }
    }
  }

  // Determine follow_up_goal based on history
  let followUpGoal = 'nudge';
  if (replyStatus === 'positive') {
    followUpGoal = 'call_to_action';
  } else if (replyStatus === 'neutral') {
    followUpGoal = 'clarification';
  } else if (replyStatus === 'rejection') {
    followUpGoal = 'exit_check';
  } else if (outboundEmails.length >= 3 || daysSinceLastEmail > 14) {
    followUpGoal = 'exit_check';
  } else if (daysSinceLastEmail > 7) {
    followUpGoal = 'value_add';
  }

  // Determine tone_stage based on outbound count
  let toneStage = 'first_follow_up';
  if (outboundEmails.length === 2) {
    toneStage = 'second_follow_up';
  } else if (outboundEmails.length === 3) {
    toneStage = 'third_follow_up';
  } else if (outboundEmails.length >= 4 || followUpGoal === 'exit_check') {
    toneStage = 'exit_email';
  }

  // Infer silence hypothesis
  const silenceHypothesis: string[] = [];
  if (daysSinceLastEmail > 7 && replyStatus === 'no_reply') {
    silenceHypothesis.push('busy');
  }
  if (outboundEmails.length > 2 && replyStatus === 'no_reply') {
    silenceHypothesis.push('low_priority');
  }
  if (inboundEmails.length === 0 && outboundEmails.length > 1) {
    silenceHypothesis.push('unclear_value');
  }
  if (silenceHypothesis.length === 0) {
    silenceHypothesis.push('busy'); // Default hypothesis
  }

  return {
    total_emails: emails.length,
    outbound_count: outboundEmails.length,
    inbound_count: inboundEmails.length,
    days_since_last_email: daysSinceLastEmail,
    reply_status: replyStatus,
    follow_up_goal: followUpGoal,
    tone_stage: toneStage,
    silence_hypothesis: silenceHypothesis,
    last_inbound_email: lastInbound ? {
      subject: lastInbound.subject,
      body: lastInbound.body?.slice(0, 1500) || lastInbound.snippet || '',
      occurred_at: lastInbound.occurred_at,
    } : null,
    last_outbound_email: lastOutbound ? {
      subject: lastOutbound.subject,
      body: lastOutbound.body?.slice(0, 1000) || lastOutbound.snippet || '',
      occurred_at: lastOutbound.occurred_at,
    } : null,
    conversation_summary: emails.slice(-5).map(e => ({
      direction: e.direction,
      subject: e.subject,
      snippet: e.snippet?.slice(0, 100) || '',
      occurred_at: e.occurred_at,
    })),
  };
}

function buildUserMessage(data: any): any {
  const email_stage = data.email_stage;
  const buyer = data.buyer;
  const seller = data.seller;
  const strategy_latest = data.strategy_latest;
  const buyer_analyze_latest = data.buyer_analyze_latest;
  const email_history = data.email_history;
  const email_history_analysis = data.email_history_analysis;
  const survey = data.survey;
  const products = data.products;

  const message: any = {
    email_stage,
    buyer: {
      company_name: buyer.company_name,
      country: buyer.country || 'Unknown',
      website: buyer.website || null,
      email: buyer.company_email || null,
      phone: buyer.company_phone || null,
      address: buyer.address || null,
      bl_hs_code: buyer.bl_hs_code || null,
      bl_product_desc: buyer.bl_product_desc || null,
    },
    seller: {
      company_name: seller.company_name,
      contact_name: seller.contact_name,
      email: seller.email,
      website: survey?.company_website || null,
      description: survey?.company_description || null,
      core_strengths: survey?.core_strengths || null,
      certifications: survey?.certifications || null,
      products: products?.map((p: any) => ({
        name: p.product_name,
        description: p.product_description,
      })) || [],
    },
    strategy_latest: strategy_latest ? {
      summary_json: strategy_latest.summary_json,
      report_markdown: strategy_latest.report_markdown?.slice(0, 3000) || null,
      generated_at: strategy_latest.generated_at,
    } : null,
    buyer_analyze_latest: buyer_analyze_latest ? {
      text: buyer_analyze_latest.text?.slice(0, 2000) || null,
      json: buyer_analyze_latest.json,
      generated_at: buyer_analyze_latest.generated_at,
    } : null,
  };

  // Add email history analysis for follow_up and reply stages
  if (email_stage === 'follow_up' || email_stage === 'reply') {
    message.email_history_analysis = email_history_analysis;
    
    // Include last few emails for context
    if (email_history && email_history.length > 0) {
      message.email_history = email_history.slice(-5).map((e: any) => ({
        direction: e.direction,
        subject: e.subject,
        body: e.body?.slice(0, 800) || e.snippet || '',
        occurred_at: e.occurred_at,
      }));
    }

    // For reply stage, emphasize the last inbound email
    if (email_stage === 'reply' && email_history_analysis?.last_inbound_email) {
      message.last_buyer_email = email_history_analysis.last_inbound_email.body;
      message.reply_context = {
        buyer_email_subject: email_history_analysis.last_inbound_email.subject,
        buyer_email_date: email_history_analysis.last_inbound_email.occurred_at,
      };
    }

    // Add auto-analyzed contact status and recommendations
    if (email_history_analysis) {
      message.contact_status = {
        sent_emails: email_history_analysis.outbound_count,
        days_since_last_email: email_history_analysis.days_since_last_email,
        reply_status: email_history_analysis.reply_status,
        open_status: 'unknown',
      };
      message.silence_hypothesis = email_history_analysis.silence_hypothesis;
      message.follow_up_goal = email_history_analysis.follow_up_goal;
      message.tone_stage = email_history_analysis.tone_stage;
      message.tone_constraints = {
        no_pressure: true,
        no_salesy_language: true,
        max_length: 120,
      };
    }
  }

  return message;
}

function parseTextResponse(content: string): any {
  // Try to find JSON block in the content
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // Continue to text parsing
    }
  }

  return {
    user_facing: content,
    internal_json: null,
  };
}

function extractSubjectLines(text: string): string[] {
  const lines: string[] = [];
  const subjectMatch = text.match(/Subject Lines?:?\s*([\s\S]*?)(?=Email Body|$)/i);
  
  if (subjectMatch) {
    const subjectSection = subjectMatch[1];
    const lineMatches = subjectSection.match(/^\d+\.\s*(.+)$/gm);
    if (lineMatches) {
      lineMatches.forEach(line => {
        const cleaned = line.replace(/^\d+\.\s*/, '').trim();
        if (cleaned) lines.push(cleaned);
      });
    }
  }
  
  return lines.length > 0 ? lines : ["Re: Business Inquiry"];
}

function extractEmailBody(text: string): string {
  const bodyMatch = text.match(/Email Body:?\s*([\s\S]*?)(?=Optional Exit Line|Internal|$)/i);
  
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }
  
  // Fallback: return everything after subject lines
  const subjectEnd = text.indexOf('Email Body');
  if (subjectEnd !== -1) {
    return text.slice(subjectEnd + 10).trim();
  }
  
  return text;
}
