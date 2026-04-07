'use client';
import { useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { toggleAnimation, toggleLayout, toggleMenu, toggleNavbar, toggleRTL, toggleSemidark, toggleTheme } from '@/store/themeConfigSlice';

interface AppProps {
    children: ReactNode;
}

function App({ children }: AppProps) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(toggleTheme(localStorage.getItem('theme') || themeConfig.theme));
        dispatch(toggleMenu(localStorage.getItem('menu') || themeConfig.menu));
        dispatch(toggleLayout(localStorage.getItem('layout') || themeConfig.layout));
        dispatch(toggleRTL(localStorage.getItem('rtlClass') || themeConfig.rtlClass));
        dispatch(toggleAnimation(localStorage.getItem('animation') || themeConfig.animation));
        dispatch(toggleNavbar(localStorage.getItem('navbar') || themeConfig.navbar));
        dispatch(toggleSemidark(localStorage.getItem('semidark') || themeConfig.semidark));
    }, [dispatch, themeConfig]);

    return (
        <div className={`${themeConfig.menu} ${themeConfig.layout} ${themeConfig.rtlClass} main-section antialiased`}>
            {children}
        </div>
    );
}

export default App;
