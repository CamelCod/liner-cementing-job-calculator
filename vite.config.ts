import path from 'path';
import { defineConfig, loadEnv, type UserConfig } from 'vite';

export default defineConfig(({ mode }) : UserConfig => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
        base: isProduction ? '/liner-cementing-job-calculator/' : '/',
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.NODE_ENV': JSON.stringify(mode)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        build: {
            minify: isProduction ? 'terser' : false,
            terserOptions: isProduction ? {
                compress: {
                    // Remove console statements in production
                    drop_console: true,
                    drop_debugger: true,
                },
                mangle: {
                    // Keep function names for better error reporting
                    keep_fnames: true,
                }
            } : {},
            // Correct placement for chunk size warning limit (was incorrectly inside rollup output)
            // Adjusted higher temporarily to avoid noise while we actively optimize remaining large chunks.
            chunkSizeWarningLimit: 1200,
            rollupOptions: {
                output: {
                    // Enhanced chunking strategy based on test report analysis
                    manualChunks: (id: string) => {
                        // Vendor dependencies
                        if (id.includes('node_modules')) {
                            // Critical UI libraries
                            if (id.includes('react') || id.includes('react-dom')) {
                                return 'vendor';
                            }
                            // Chart libraries (identified as large in test report)
                            if (id.includes('recharts') || id.includes('d3-')) {
                                return 'charts';
                            }
                            // Three.js and related (1.16MB chunk identified in test report)  
                            if (id.includes('three') || id.includes('@react-three/')) {
                                return 'three';
                            }
                            // PDF generation
                            if (id.includes('jspdf') || id.includes('html2canvas')) {
                                return 'pdf';
                            }
                            // Icons
                            if (id.includes('lucide-react')) {
                                return 'icons';
                            }
                            // Everything else
                            return 'vendor-misc';
                        }
                        return undefined; // explicit
                    }
                }
            }
        },
        // Security headers for development server
        server: {
            headers: {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
            }
        }
    };
});
