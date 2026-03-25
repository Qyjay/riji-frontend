import type { Fortune, ChatMessage } from '../api/ai'

const chatHistory: ChatMessage[] = [
  { role: 'user', content: '最近感觉压力好大，雅思和留学申请同时进行有点喘不过气来', timestamp: Date.now() - 3600000 * 8 },
  { role: 'assistant', content: '我理解这种感觉！多线作战确实很累。不过你想想，每完成一个任务就是离目标更近一步。把大目标拆成小目标会轻松很多哦～', timestamp: Date.now() - 3600000 * 7 },
  { role: 'user', content: '可是我总是拖延怎么办...每次计划好要学习，结果刷手机就过去了好几个小时', timestamp: Date.now() - 3600000 * 6 },
  { role: 'assistant', content: '试试"两分钟法则"！告诉自己只学两分钟，一般开始后就停不下来了。另外可以把手机放到另一个房间，用专注模式来阻断干扰～', timestamp: Date.now() - 3600000 * 5 },
  { role: 'user', content: '有道理！对了，今天做了套雅思阅读全对了！', timestamp: Date.now() - 3600000 * 2 },
  { role: 'assistant', content: '太棒了！！！🎉 这就是你努力的回报！继续保持这个状态，7.5分指日可待！', timestamp: Date.now() - 3600000 * 1.5 },
  { role: 'user', content: '谢谢你的鼓励，今天聊完心情好多了', timestamp: Date.now() - 3600000 * 1 },
  { role: 'assistant', content: '不客气！记住，你已经很努力了，偶尔休息一下也是正常的。保持好节奏，相信自己，一定可以拿到理想offer的！🍀', timestamp: Date.now() - 3600000 * 0.5 },
]

export function chat(message: string): string {
  if (!message) return '你好呀！有什么想聊的吗？'
  if (message.includes('雅思') || message.includes('阅读') || message.includes('学习')) {
    return '加油！坚持就是胜利，你已经做得很棒了！学习是一个积累的过程，相信自己的努力一定会有回报的～'
  }
  if (message.includes('谢谢') || message.includes('开心') || message.includes('高兴')) {
    return '很开心能帮到你！记得每天都要元气满满，我随时都在这里陪你聊天哦～'
  }
  if (message.includes('难过') || message.includes('焦虑') || message.includes('压力')) {
    return '我理解你的感受，压力有时候真的很大。但你知道吗，你能意识到并说出来，已经很勇敢了。要不要和我说说具体是什么让你感到难过？'
  }
  if (message.includes('日记') || message.includes('今天')) {
    return '今天发生了什么有趣的事情吗？我很想听你分享！记录生活的点滴，是很美好的习惯呀。'
  }
  return '我理解你的感受！不管发生什么，都要好好照顾自己呀。有什么需要聊的，我一直都在～'
}

export function getChatHistory(page = 1, pageSize = 20): { list: ChatMessage[]; total: number } {
  const start = (page - 1) * pageSize
  const list = chatHistory.slice(start, start + pageSize)
  return { list, total: chatHistory.length }
}

export function textToSpeech(_text: string, _voice?: string): string {
  return 'https://example.com/tts/mock-audio.mp3'
}

export function generateFortune(): Fortune {
  return {
    overall: 4,
    study: 4,
    social: 5,
    health: 3,
    tip: '今天适合去图书馆认真学习，下午有意外惊喜',
    luckyColor: '暖橙色',
    luckyNumber: 7,
  }
}
