'use client'

import { useState } from 'react'
import {
  LineItemsTable,
  type ChangeOrderLineItem,
} from '@/components/domain/change-orders/LineItemsTable'

export default function TestLineItemsPage() {
  const [items, setItems] = useState<ChangeOrderLineItem[]>([])
  const [readOnly, setReadOnly] = useState(false)

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LineItemsTable Test Page</h1>
        <button
          onClick={() => setReadOnly(!readOnly)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle Read Only: {readOnly ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Editable Mode (items: {items.length})
        </h2>
        <LineItemsTable
          lineItems={items}
          onChange={setItems}
          readOnly={readOnly}
          showTotals={true}
        />
      </div>

      <div className="mt-8 p-4 bg-muted dark:bg-foreground/90 rounded">
        <h3 className="font-semibold mb-2">Current Data (JSON):</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(items, null, 2)}
        </pre>
      </div>
    </div>
  )
}
