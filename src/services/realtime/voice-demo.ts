import type { VoiceSocketState } from './voice-socket'
import type {
  ConfirmationDecision,
  VoiceServerEvent,
} from './voice-protocol'

interface DemoHandlers {
  onEvent: (event: VoiceServerEvent) => void
  onState: (state: VoiceSocketState) => void
}

function event(
  type: string,
  fields: Record<string, unknown> = {},
): VoiceServerEvent {
  return {
    type,
    eventId: `demo-${type}-${Date.now()}`,
    sessionId: 'demo-voice-session',
    timestamp: Date.now(),
    ...fields,
  } as VoiceServerEvent
}

export function createDemoVoiceSocket(
  handlers: DemoHandlers,
  scenario: 'memory' | 'mission' = 'memory',
) {
  const timers: ReturnType<typeof setTimeout>[] = []
  const schedule = (delay: number, callback: () => void) => {
    timers.push(setTimeout(callback, delay))
  }
  return {
    async connect() {
      handlers.onState('open')
      handlers.onEvent(event('session.ready', {
        providerSessionId: 'demo-provider-session',
      }))
      if (scenario === 'mission') {
        schedule(350, () => handlers.onEvent(event('asr.done', {
          text: '今晚想找一个人看科幻电影',
          itemId: 'demo-user-mission',
        })))
        schedule(700, () => handlers.onEvent(event('assistant.text.done', {
          text: '我按今晚、南开附近、再找一人整理好了，确认后只会搜索公开信息。',
          itemId: 'demo-assistant-mission',
        })))
        schedule(900, () => handlers.onEvent(event('tool.result', {
          name: 'draft_social_mission',
          display: {
            kind: 'mission_draft',
            draftId: 'demo-draft',
            summary: {
              activity: '今晚看科幻电影',
              time: '今晚',
              location: '南开大学附近 5 km',
              headcount: '再找 1 人',
              scope: '公开帖子与授权名片',
              notice: '不会自动发帖或申请认识',
            },
            questions: [],
            readyForConfirmation: true,
          },
        })))
        schedule(1050, () => handlers.onEvent(event('confirmation.required', {
          confirmation: {
            id: 'demo-confirmation',
            action: 'start_social_mission',
            riskLevel: 'R2',
            title: '开始寻找今晚的电影搭子？',
            summary: [
              '活动：今晚看科幻电影',
              '地点：南开大学附近 5 km',
              '人数：再找 1 人',
            ],
            expiresAt: Date.now() + 120000,
            approveLabel: '确认开始',
            rejectLabel: '再改一下',
          },
        })))
      } else {
        schedule(350, () => handlers.onEvent(event('asr.done', {
          text: '你还记得我上次拍晚霞吗',
          itemId: 'demo-user-memory',
        })))
        schedule(700, () => handlers.onEvent(event('assistant.text.done', {
          text: '我找到 8 月 6 日的《同一片晚霞》。你写到湖面有很碎的橙色反光。',
          itemId: 'demo-assistant-memory',
        })))
        schedule(900, () => handlers.onEvent(event('tool.result', {
          name: 'search_personal_memory',
          display: {
            kind: 'memory_evidence',
            items: [
              {
                sourceType: 'diary',
                title: '同一片晚霞',
                snippet: '傍晚在湖边拍到一片很低的橙色晚霞，湖面有很碎的反光。',
                occurredAt: Date.now() - 86400000 * 12,
                deepLink: '/pages/diary/detail?id=demo-diary',
              },
            ],
          },
        })))
      }
    },
    appendAudio() {},
    commitAudio() {},
    cancelResponse() {
      handlers.onEvent(event('response.canceled'))
    },
    resolveConfirmation(_id: string, decision: ConfirmationDecision) {
      handlers.onEvent(event('confirmation.resolved', {
        confirmationId: 'demo-confirmation',
        decision,
        channel: 'screen',
      }))
      if (decision === 'approve') {
        handlers.onEvent(event('tool.result', {
          name: 'start_social_mission',
          display: {
            kind: 'mission_progress',
            mission: {
              id: 'demo-mission',
              title: '今晚看科幻电影',
              status: 'awaiting_user',
              candidateCount: 2,
              pendingCount: 2,
              deepLink: '/pages/social/mission-detail?id=demo-mission',
            },
            scannedCount: 16,
            matchedCount: 2,
            candidates: [],
            suggestion: '找到 2 个候选，需要由你本人查看并决定。',
          },
        }))
        handlers.onEvent(event('navigation.suggested', {
          path: '/pages/social/mission-detail?id=demo-mission',
          label: '查看任务进度',
        }))
      }
    },
    close() {
      timers.forEach(clearTimeout)
      handlers.onState('closed')
      handlers.onEvent(event('session.closed', {
        reason: 'user',
        summary: {
          durationSec: 42,
          memoryCount: scenario === 'memory' ? 1 : 0,
          missionId: scenario === 'mission' ? 'demo-mission' : null,
        },
      }))
    },
  }
}
