import React from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {Motion, demo} from './Motion';

const target = document.getElementById('motion-preview');
if (target) createRoot(target).render(<Player component={Motion} inputProps={demo} durationInFrames={120} fps={30} compositionWidth={1080} compositionHeight={1920} controls style={{height: '80vh', maxWidth: '100%'}} />);
