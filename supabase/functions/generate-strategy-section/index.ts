import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODEL_NAME = 'grok-4-1-fast-reasoning';

const SECTION_PROMPTS: Record<number, { title: string; instructions: string }> = {
  1: {
    title: '기업 개요 및 제품 포지셔닝',
    instructions: `제품/서비스의 글로벌 시장에서의 포지셔닝을 분석하세요.
- 글로벌 벤치마크 브랜드와 비교
- 제품의 차별화 요소
- 시장 내 경쟁 위치`
  },
  2: {
    title: '글로벌 시장 동향 및 수출 가능성 진단',
    instructions: `해당 제품군의 글로벌 시장 동향을 분석하세요.
- 실제 관찰 가능한 거시적/산업 트렌드 참조
- 수출 가능성 평가
- 시장 성장 동인`
  },
  3: {
    title: '주요 경쟁사 및 대체재 분석',
    instructions: `실제 경쟁사를 식별하고 분석하세요.
- 구체적인 경쟁사 이름 제시
- 바이어들이 경쟁사를 선택하는 이유
- 대체재 위협`
  },
  4: {
    title: '목표 수출 시장 및 진입 논리',
    instructions: `목표 시장 진입 전략을 분석하세요.
- 시장 진입 논리 설명 (단순 지역명 나열 금지)
- 시장별 특성과 기회
- 진입 우선순위 및 근거`
  },
  5: {
    title: 'HS CODE 및 수입 구조 분석',
    instructions: `HS CODE와 무역 흐름을 분석하세요.
- 6자리 국제 HS CODE만 사용
- 무역 흐름 행동 패턴
- 주요 수입국과 수입 이유`
  },
  6: {
    title: '국가별 진입 장벽 및 리스크 요인',
    instructions: `진입 장벽과 리스크를 분석하세요.
- 규제 리스크와 상업적 리스크 구분
- 국가별 구체적 장벽
- 리스크 완화 방안`
  },
  7: {
    title: '유통 구조 및 잠재 바이어 유형',
    instructions: `유통 채널과 바이어 유형을 분석하세요.
- 실제 바이어 의사결정 구조 (결정자, 지불자)
- 유통 채널별 특성
- 바이어 접근 전략`
  },
  8: {
    title: '수출 전략 및 단계별 실행 제안',
    instructions: `구체적인 수출 전략을 제안하세요.
- 모든 권고사항은 실제 제약 조건과 연결
- 단계별 실행 계획
- 성과 지표`
  }
};

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
    const grokApiKey = Deno.env.get('TaaS_CRM_Strategy_Test');
    
    if (!grokApiKey) {
      return new Response(JSON.stringify({ error: 'AI 서비스 설정이 필요합니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user_id directly from JWT payload
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

    const { report_id, section_number, survey_context } = await req.json();

    if (!report_id || !section_number || section_number < 1 || section_number > 8) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify report belongs to user
    const { data: report, error: reportError } = await supabase
      .from('strategy_reports')
      .select('id, user_id, sections')
      .eq('id', report_id)
      .single();

    if (reportError || !report || report.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sectionConfig = SECTION_PROMPTS[section_number];
    
    const systemPrompt = `당신은 TradeIt SaaS AI CORE — 수출 전략 분석 전문가입니다.
반드시 한국어로 작성하세요. 영문 문장은 금지입니다.
기술 용어(HS CODE, CAGR, FDA 등)만 영문 사용 가능.

당신은 요약자가 아닙니다. 사용자 입력을 재서술하지 마세요.
독립적인 리서치 기반 분석을 수행하세요.`;

    const userPrompt = `[기업 정보]
웹사이트: ${survey_context.company_website || '미입력'}
회사 설명: ${survey_context.company_description || '미입력'}
설립연도: ${survey_context.year_founded || '미입력'}
직원 수: ${survey_context.employee_count || '미입력'}
핵심 강점: ${survey_context.core_strengths || '미입력'}
수출 경험: ${survey_context.export_experience}
기존 시장: ${survey_context.existing_markets}
인증: ${survey_context.certifications}
목표 지역: ${survey_context.target_regions}
제품: ${survey_context.product_list}

[작성 지침]
## ${section_number}. ${sectionConfig.title}

${sectionConfig.instructions}

[필수 형식]
- 정확히 6개 단락 작성
- 각 단락 2-3문장
- 불릿 포인트 사용 금지
- 표는 6단락 이후에만 선택적 사용

[단락 역할]
1단락: 사용자 제공 사실 정리 (재서술 금지)
2단락: 외부 시장/산업 사실
3단락: 경쟁/구조적 맥락
4단락: 무역/바이어/수입 행동 인사이트
5단락: 제약, 리스크, 실제 마찰
6단락: 분석적 판단 (수출 결정에 중요한 이유)`;

    console.log(`Generating section ${section_number}: ${sectionConfig.title}`);

    const aiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`Section ${section_number} generation failed:`, errorText);
      
      // Mark section as error
      const updatedSections = { ...(report.sections as object || {}), [`section${section_number}`]: { status: 'error', content: null } };
      await supabase
        .from('strategy_reports')
        .update({ sections: updatedSections })
        .eq('id', report_id);
      
      return new Response(JSON.stringify({ 
        error: 'AI 섹션 생성 실패',
        section_number,
        can_retry: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const sectionContent = aiData.choices?.[0]?.message?.content || '';

    // Update sections in database
    const updatedSections = { 
      ...(report.sections as object || {}), 
      [`section${section_number}`]: { 
        status: 'completed', 
        content: sectionContent,
        title: sectionConfig.title 
      } 
    };
    
    // Check if all sections are complete
    const completedCount = Object.values(updatedSections).filter(
      (s: any) => s.status === 'completed'
    ).length;
    
    const newStatus = completedCount >= 8 ? 'completed' : 'generating';
    
    // If complete, combine all sections into content field
    let fullContent = '';
    if (newStatus === 'completed') {
      for (let i = 1; i <= 8; i++) {
        const sec = updatedSections[`section${i}`] as any;
        if (sec?.content) {
          fullContent += sec.content + '\n\n';
        }
      }
    }
    
    await supabase
      .from('strategy_reports')
      .update({ 
        sections: updatedSections,
        status: newStatus,
        ...(fullContent ? { content: fullContent.trim() } : {})
      })
      .eq('id', report_id);

    console.log(`Section ${section_number} completed, total: ${completedCount}/8`);

    return new Response(JSON.stringify({
      success: true,
      section_number,
      section_title: sectionConfig.title,
      section_content: sectionContent,
      is_complete: newStatus === 'completed',
      completed_count: completedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: '예기치 않은 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
