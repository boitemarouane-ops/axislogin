'use client'

import { Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import NewInvoiceForm from '@/components/invoices/NewInvoiceForm'

export default function NewInvoicePage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <NewInvoiceForm />
      </Suspense>
    </AppLayout>
  )
}
