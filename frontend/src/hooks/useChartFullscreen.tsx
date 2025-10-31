import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, IconButton, Typography, useMediaQuery, Theme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface UseChartFullscreenProps {
    chartRef: React.RefObject<HTMLDivElement | null>;
    title?: string;
    onPrevious?: () => void;
    onNext?: () => void;
}

export const useChartFullscreen = ({ chartRef, title, onPrevious, onNext }: UseChartFullscreenProps) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    const handleFullscreenToggle = async () => {
        if (!chartRef.current) return;
        if (!document.fullscreenElement) {
            try {
                await chartRef.current.requestFullscreen();
                if (window.screen.orientation?.lock) {
                    await window.screen.orientation.lock('landscape');
                }
            } catch (err) {
                console.error('Error entering fullscreen:', err);
            }
        } else {
            try {
                await document.exitFullscreen();
                if (window.screen.orientation?.unlock) {
                    window.screen.orientation.unlock();
                }
            } catch (err) {
                console.error('Error exiting fullscreen:', err);
            }
        }
    };

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    const FullscreenEnterButton = () => (
        <>
            {isMobile && !isFullscreen && (
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                    <IconButton onClick={handleFullscreenToggle} size="small" color="primary">
                        <FullscreenIcon />
                    </IconButton>
                </Box>
            )}
        </>
    );

    const FullscreenExitButton = () => (
        <>
            {isFullscreen && (
                 <IconButton onClick={handleFullscreenToggle} color="primary" sx={{ position: 'absolute', top: 8, right: 8, zIndex: 11 }}>
                    <FullscreenExitIcon />
                    <Typography variant="button" sx={{ ml: 1 }}>退出</Typography>
                </IconButton>
            )}
        </>
    );

    const FullscreenTitle = () => (
        <>
            {isFullscreen && (
                <Typography sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 11, color: 'text.primary', backgroundColor: 'rgba(255, 255, 255, 0.7)', padding: '2px 8px', borderRadius: '4px' }}>
                    {title}
                </Typography>
            )}
        </>
    );

    const NavigationButtons = () => (
        <>
            {isFullscreen && onPrevious && onNext && (
                <>
                    <IconButton
                        onClick={onPrevious}
                        sx={{ position: 'absolute', top: '50%', left: 16, zIndex: 11, transform: 'translateY(-50%)', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    >
                        <ArrowBackIosNewIcon />
                    </IconButton>
                    <IconButton
                        onClick={onNext}
                        sx={{ position: 'absolute', top: '50%', right: 16, zIndex: 11, transform: 'translateY(-50%)', color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                    >
                        <ArrowForwardIosIcon />
                    </IconButton>
                </>
            )}
        </>
    );

    return { isFullscreen, FullscreenEnterButton, FullscreenExitButton, FullscreenTitle, NavigationButtons };
};