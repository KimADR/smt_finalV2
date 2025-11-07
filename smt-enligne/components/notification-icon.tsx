"use client"
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationIcon({ className }: { className?: string }) {
  const { notifications } = useNotifications()
  const unread = notifications.filter(n => !n.read).length

  return (
    <div className={className}>
      <Button variant="outline" size="icon" aria-label="Notifications">
        <Bell className="h-5 w-5" />
      </Button>
      {unread > 0 && (
        // @ts-ignore
        <Badge variant="destructive" className="ml-2 text-xs">{unread}</Badge>
      )}
    </div>
  )
}
