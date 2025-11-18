import * as React from 'react'

import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, height, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative h-full w-full overflow-y-auto', className)}
        style={height ? { maxHeight: height } : undefined}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
