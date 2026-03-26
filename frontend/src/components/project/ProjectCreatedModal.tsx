'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { ArrowRight, Users, DollarSign, FileText, Image, Calendar, Building2 } from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
  },
  {
    icon: DollarSign,
    title: 'Create Budget',
    description: 'Set up project budget and line items',
    href: (projectId: string) => `/${projectId}/budget`,
  },
  {
    icon: Building2,
    title: 'Create Prime Contract',
    description: 'Establish primary contract terms',
    href: (projectId: string) => `/${projectId}/prime-contracts`,
  },
  {
    icon: FileText,
    title: 'Add Specifications',
    description: 'Upload project specifications',
    href: (projectId: string) => `/${projectId}/specifications`,
  },
  {
    icon: Image,
    title: 'Upload Drawings',
    description: 'Add architectural and engineering drawings',
    href: (projectId: string) => `/${projectId}/drawings`,
  },
  {
    icon: Calendar,
    title: 'Create Schedule',
    description: 'Build project timeline and milestones',
    href: (projectId: string) => `/${projectId}/schedule`,
  },
]

export function ProjectCreatedModal({ isOpen, onClose, projectId, projectName }: ProjectCreatedModalProps) {
  const prefersReducedMotion = useReducedMotion()

  // Stamp drop: falls from above, thuds down with a slight compression on impact
  const stampAnimation = prefersReducedMotion
    ? { opacity: 1, y: 0, rotate: -4, scale: 1 }
    : {
        opacity: [0, 1, 1, 1],
        y: [-55, 0, 5, 0],
        rotate: [-4, -4, -4.8, -4],
        scale: [1, 1, 0.96, 1],
      }

  const stampTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : {
        delay: 0.25,
        duration: 0.55,
        times: [0, 0.62, 0.82, 1],
        ease: ['easeIn', 'easeOut', 'easeInOut', 'easeOut'],
      }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 overflow-hidden bg-card rounded-xl shadow-sm border-border">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="relative px-8 pt-8 pb-5 text-center overflow-visible">

            {/* Very subtle blueprint grid — document texture */}
            <div
              className="absolute inset-0 rounded-t-xl opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Stamp — drops onto the document */}
            <div className="relative mb-3 flex justify-center">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -55, rotate: -4 }}
                animate={stampAnimation}
                transition={stampTransition}
                className="relative select-none pointer-events-none"
              >
                <NextImage
                  src="/images/issued-stamp.png"
                  alt="Issued for Construction"
                  width={260}
                  height={130}
                  priority
                  className="w-[220px] h-auto"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </motion.div>
            </div>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50 mb-2"
            >
              {projectName}
            </motion.p>

            <motion.h2
              initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-2xl font-semibold text-foreground tracking-tight mb-1"
            >
              Project Created
            </motion.h2>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              Let&apos;s build something great.
            </motion.p>
          </div>

          {/* Next Steps */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Next Steps
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-0.5">
              {nextSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.title}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.22, ease: 'easeOut' }}
                  >
                    <Link
                      href={step.href(projectId)}
                      onClick={onClose}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors duration-100"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none mb-0.5">
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            className="px-5 pb-5 pt-3 border-t border-border flex items-center justify-between"
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              Or explore your project
            </p>
            <Button onClick={onClose} size="sm" className="gap-1.5 group">
              View Dashboard
              <ArrowRight className="group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
