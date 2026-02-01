'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowRight, Users, DollarSign, FileText, Image, Calendar, Building2 } from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProjectCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

const nextSteps = [
  {
    icon: Users,
    title: 'Update Directory',
    description: 'Add team members and assign roles',
    href: (projectId: string) => `/${projectId}/directory`,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: DollarSign,
    title: 'Create Budget',
    description: 'Set up project budget and line items',
    href: (projectId: string) => `/${projectId}/budget`,
    color: 'from-emerald-500 to-teal-500'
  },
  {
    icon: Building2,
    title: 'Create Prime Contract',
    description: 'Establish primary contract terms',
    href: (projectId: string) => `/${projectId}/prime-contracts`,
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: FileText,
    title: 'Add Specifications',
    description: 'Upload project specifications',
    href: (projectId: string) => `/${projectId}/specifications`,
    color: 'from-purple-500 to-violet-500'
  },
  {
    icon: Image,
    title: 'Upload Drawings',
    description: 'Add architectural and engineering drawings',
    href: (projectId: string) => `/${projectId}/drawings`,
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: Calendar,
    title: 'Create Schedule',
    description: 'Build project timeline and milestones',
    href: (projectId: string) => `/${projectId}/schedule`,
    color: 'from-indigo-500 to-blue-500'
  }
]

export function ProjectCreatedModal({ isOpen, onClose, projectId, projectName }: ProjectCreatedModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden"
        >
          {/* Blueprint Grid Background */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-400"/>
                  <circle cx="0" cy="0" r="1" fill="currentColor" className="text-blue-400"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
            </svg>
          </div>

          {/* Diagonal Accent Lines */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-orange-400 to-transparent rotate-45 origin-top-right" />
            <div className="absolute top-8 right-0 w-1 h-full bg-gradient-to-b from-orange-400 to-transparent rotate-45 origin-top-right" />
          </div>

          <div className="relative z-10 p-8">
            {/* Header with Sprouting Animation */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/50"
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
                </motion.div>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-emerald-100 bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-geist-sans)' }}
              >
                Project Created!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="text-slate-400 font-mono text-sm tracking-wide"
              >
                {projectName} is ready to build
              </motion.p>
            </div>

            {/* Construction Timeline */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4 px-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
                  Next Steps
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
              </div>

              <div className="space-y-3 relative">
                {/* Vertical Timeline Line */}
                <div className="absolute left-[2.6rem] top-0 bottom-0 w-px bg-gradient-to-b from-slate-600 via-slate-700 to-transparent" />

                {nextSteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.08, duration: 0.4 }}
                    >
                      <Link
                        href={step.href(projectId)}
                        onClick={onClose}
                        className="group relative flex items-start gap-4 p-4 rounded-lg bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-300"
                      >
                        {/* Timeline Dot */}
                        <div className="relative flex-shrink-0">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.7 + index * 0.08, duration: 0.3 }}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                              step.color
                            )}
                          >
                            <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                          </motion.div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-white group-hover:text-blue-200 transition-colors">
                              {step.title}
                            </h3>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-sm text-slate-400 font-mono">
                            {step.description}
                          </p>
                        </div>

                        {/* Construction Mark Accent */}
                        <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-orange-500/30 group-hover:border-orange-400/50 transition-colors" />
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Footer CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.4 }}
              className="text-center pt-6 border-t border-slate-700/50"
            >
              <p className="text-xs text-slate-500 font-mono mb-4 uppercase tracking-wider">
                Or explore your project
              </p>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/30 font-semibold px-8 group"
              >
                View Project Dashboard
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </div>

          {/* Corner Construction Marks */}
          <div className="absolute bottom-4 left-4 text-orange-500/20 font-mono text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-l border-b border-current" />
              <span>EST. 2026</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 text-orange-500/20 font-mono text-xs">
            <div className="flex items-center gap-1">
              <span>PROJECT #{projectId.slice(0, 6).toUpperCase()}</span>
              <div className="w-3 h-3 border-t border-r border-current" />
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
