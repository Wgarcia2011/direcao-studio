import React from 'react';
import {AbsoluteFill, staticFile} from 'remotion';
import {MotionLine, MotionReveal, MotionWords} from './components';

/** Synthetic fixture: no user media, transcription or project writes. */
export const MotionLibraryDemo: React.FC = () => <AbsoluteFill style={{background: '#151020', color: '#f5f0ff', fontFamily: 'Manrope', padding: 72, justifyContent: 'center', gap: 36}}>
  <style>{`@font-face{font-family:Manrope;src:url('${staticFile('fonts/manrope-700.ttf')}');font-weight:700}`}</style>
  <MotionReveal style={{fontSize: 58, fontWeight: 700}}>Sua ideia ganha movimento.</MotionReveal>
  <MotionWords words={['Preparar.', 'Criar.', 'Revisar.']} starts={[15, 30, 45]} style={{fontSize: 38, fontWeight: 700, color: '#4ee2c0'}}/>
  <svg viewBox="0 0 800 100" width="800" height="100"><MotionLine d="M8 70 C160 70 160 20 300 20 S480 70 600 70 L780 70 M756 48 L780 70 L756 92" from={30} drawFrames={42} stroke="#b798ff"/></svg>
  <MotionReveal from={50} distance={48} energy="soft" style={{alignSelf: 'flex-start', background: '#251832', padding: '24px 32px', borderRadius: 12, fontSize: 28}}>Título, palavras e traço no mesmo relógio.</MotionReveal>
</AbsoluteFill>;
