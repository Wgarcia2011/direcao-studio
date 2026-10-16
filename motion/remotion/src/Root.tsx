import React from 'react';
import {Composition} from 'remotion';
import {Motion, demo} from './Motion';

export const Root: React.FC = () => <Composition id="DirecaoMotion" component={Motion} width={1080} height={1920} fps={30} durationInFrames={120} defaultProps={demo} />;
