// 基于 Web Audio API 纯算法合成音效，零依赖外部音频资源文件

class SoundService {
  private ctx: AudioContext | null = null
  private noiseNode: AudioNode | null = null
  private noiseGain: GainNode | null = null

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      this.ctx = new AudioCtx()
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  // 待办划掉完成时的轻巧清脆提示音
  playCheckSound() {
    try {
      const ctx = this.getContext()
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      // 快速滑音：从 520Hz 滑到 880Hz (C5 到 A5)，带来明快的完成愉悦感
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.16)
    } catch {
      // 容错静默
    }
  }

  // 番茄钟开始时的温和颂钵钟声
  playStartBell() {
    try {
      const ctx = this.getContext()
      const now = ctx.currentTime
      
      const freqs = [440, 880, 1320] // 泛音叠加
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        const baseGain = 0.15 / (idx + 1)
        gain.gain.setValueAtTime(baseGain, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 1.8)
      })
    } catch {
      // 容错静默
    }
  }

  // 番茄钟完成时的优雅三重奏庆祝钟声
  playCompleteBell() {
    try {
      const ctx = this.getContext()
      const notes = [523.25, 659.25, 783.99, 1046.5] // C E G C 大三和弦
      const startTime = ctx.currentTime

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const noteStart = startTime + i * 0.12

        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, noteStart)

        gain.gain.setValueAtTime(0.2, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.8)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + 2.0)
      })
    } catch {
      // 容错静默
    }
  }

  // 待办到期时的清脆晶体双音钟鸣闹铃 (Crystal Marimba Alarm Chime)
  playDueAlarm() {
    try {
      const ctx = this.getContext()
      const now = ctx.currentTime

      // 快速两组轻快的「叮铃~ 叮铃~」上行晶体双和弦 (A5 880Hz -> C#6 1108Hz)
      const pairs = [
        { time: now, f1: 880, f2: 1108.73 },
        { time: now + 0.18, f1: 987.77, f2: 1318.51 },
        { time: now + 0.55, f1: 880, f2: 1108.73 },
        { time: now + 0.73, f1: 987.77, f2: 1318.51 },
      ]

      pairs.forEach(p => {
        [p.f1, p.f2].forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = idx === 0 ? 'sine' : 'triangle'
          osc.frequency.setValueAtTime(freq, p.time)

          const vol = idx === 0 ? 0.22 : 0.15
          gain.gain.setValueAtTime(vol, p.time)
          gain.gain.exponentialRampToValueAtTime(0.0001, p.time + 0.32)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(p.time)
          osc.stop(p.time + 0.35)
        })
      })
    } catch {
      // 容错静默
    }
  }

  // 专注白噪音 / 暖棕色心流音
  startAmbientNoise(volume = 0.05) {
    if (this.noiseNode) return
    try {
      const ctx = this.getContext()
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      
      // 生成柔和的粉红/棕色噪声
      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        data[i] = (lastOut + 0.02 * white) / 1.02
        lastOut = data[i]
        data[i] *= 3.5 // 补偿增益
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(volume, ctx.currentTime)

      noise.connect(gain)
      gain.connect(ctx.destination)

      noise.start()
      this.noiseNode = noise
      this.noiseGain = gain
    } catch {
      // 容错静默
    }
  }

  stopAmbientNoise() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as any).stop()
        this.noiseNode.disconnect()
      } catch {}
      this.noiseNode = null
      this.noiseGain = null
    }
  }
}

export const sound = new SoundService()
