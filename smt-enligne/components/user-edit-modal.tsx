"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContentNoClose,
} from '@/components/ui/dialog'
import UserEditForm from './user-edit-form'

type Props = {
  userId: string
  triggerClassName?: string
  triggerLabel?: string
  onUpdated?: (user: any) => void
}

export default function UserEditModal({ userId, triggerClassName, triggerLabel = 'Modifier', onUpdated }: Props) {
  const router = useRouter()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <Edit className="h-4 w-4 mr-2" /> {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContentNoClose className="w-full max-w-3xl p-0 max-h-[80vh] overflow-auto">
        {/* The form renders its own Card header/title - keep content compact */}
        <div className="mt-0">
          <UserEditForm
            userId={userId}
            onClose={() => { /* Dialog will close automatically via DialogClose in form or parent */ }}
            onUpdated={(u) => {
              // let parent handle it if provided
              onUpdated?.(u)
              // ensure server-rendered pages refresh (for example when used on profile page)
              try { router.refresh() } catch (e) { /* ignore */ }
            }}
          />
        </div>
      </DialogContentNoClose>
    </Dialog>
  )
}
