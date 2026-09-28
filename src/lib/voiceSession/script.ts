// What the fake agent says, in order. Each line is a recorded clip plus its caption.
import ar1 from '@assets/audio/agent-ar-1.m4a'
import ar2 from '@assets/audio/agent-ar-2.m4a'
import ar3 from '@assets/audio/agent-ar-3.m4a'
import en1 from '@assets/audio/agent-en-1.m4a'
import en2 from '@assets/audio/agent-en-2.m4a'
import en3 from '@assets/audio/agent-en-3.m4a'
import type { Lang } from '@lib/i18n/context'

export type AgentLine = { audio: string; text: string }

export const AGENT_LINES: Record<Lang, AgentLine[]> = {
  en: [
    { audio: en1, text: 'Hi Faisal! I’m your virtual assistant. How can I help you today?' },
    { audio: en2, text: 'Sure, let me check your account balance.' },
    { audio: en3, text: 'Your current balance is 1,250 riyals. Anything else?' },
  ],
  // Gulf agents switch to English mid-sentence; line 2 does too, to exercise mixed-direction captions.
  ar: [
    { audio: ar1, text: 'أهلاً فيصل! أنا مساعدك الافتراضي. كيف أقدر أساعدك اليوم؟' },
    { audio: ar2, text: 'تمام، خلّيني أشيك على الـ account balance حقّك.' },
    { audio: ar3, text: 'رصيدك الحالي 1,250 ريال. تحتاج شي ثاني؟' },
  ],
}
