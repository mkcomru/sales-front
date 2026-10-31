import React from 'react';
import { ArrowLeft, X, Package } from 'lucide-react';
import type { CompanyField, CompanyMember } from '../types';
import type { StageTemplate, Customer } from '../types/api';
import {
  CustomerContacts,
  CustomerFieldsEditor,
  CustomerOrderHistory,
  QualificationFormFields,
} from './customer';
import type { TransportMeta } from './customer';

interface CustomerProfileProps {
  customer: Customer;
  stages: StageTemplate[];
  companyId?: number;
  companyFields: CompanyField[];
  managers: CompanyMember[];
  transportMeta?: TransportMeta;
  currentStageId?: string;
  currentAssigneeId?: string;
  currentOrderId?: number;
  customerId?: number;
  onClose?: () => void;
  onSaveContact?: (name: string, phone: string) => void;
  onFieldChange?: (key: string, value: string | number | boolean | null) => void;
  onUpdateStage?: (stageId: string) => void;
  onUpdateAssignee?: (managerId: string) => void;
  onOpenOrder?: (orderId: number) => void;
  chatDebugInfo?: { id: string; channelType?: string; orderId?: number; username?: string; phone?: string };
  variant?: 'desktop' | 'mobile';
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({
  customer,
  stages,
  companyId,
  companyFields,
  managers,
  transportMeta,
  currentStageId = '',
  currentAssigneeId = '',
  currentOrderId,
  customerId,
  onClose,
  onSaveContact,
  onFieldChange,
  onUpdateStage,
  onUpdateAssignee,
  onOpenOrder,
  chatDebugInfo,
  variant = 'desktop',
}) => {
  const customerLevelFields = companyFields.filter(f => f.level === 'customer');
  const customerFieldValues = (customer.customer_fields ?? {}) as Record<string, string | number | boolean | null>;
  const isMobile = variant === 'mobile';

  return (
    <div className={`${isMobile ? 'w-full' : 'w-[300px] border-l border-gray-200'} bg-white flex flex-col flex-shrink-0 h-full min-h-0 overflow-hidden`}>
      {/* Header */}
      <div className={`${isMobile ? 'px-4 pb-3 pt-[max(env(safe-area-inset-top),10px)]' : 'h-[64px] px-6'} flex items-center justify-between flex-shrink-0 border-b border-gray-100 bg-white`}>
        <div className="flex items-center gap-2">
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
              aria-label="Назад к чату"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h3 className={`${isMobile ? 'text-[16px]' : 'text-[14px]'} font-bold text-gray-900`}>
            Детали
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onOpenOrder && currentOrderId && (
            <button
              onClick={() => onOpenOrder(currentOrderId)}
              className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 rounded hover:bg-indigo-50"
              title="Открыть детали заказа"
            >
              <Package size={16} />
            </button>
          )}
          {onClose && !isMobile && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded hover:bg-gray-100">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className={`min-h-full flex flex-col gap-6 ${isMobile ? 'p-4 pb-[calc(env(safe-area-inset-bottom)+20px)]' : 'p-6'}`}>
        <QualificationFormFields
          stages={stages}
          managers={managers}
          currentStageId={currentStageId}
          currentAssigneeId={currentAssigneeId}
          onUpdateStage={onUpdateStage}
          onUpdateAssignee={onUpdateAssignee}
        />

        {/* Contacts */}
        <CustomerContacts
          customer={customer}
          transportMeta={transportMeta}
          onSaveContact={onSaveContact}
        />

        <div className="h-px bg-gray-100" />

        {/* Customer Fields */}
        <CustomerFieldsEditor
          fields={customerLevelFields}
          values={customerFieldValues}
          onFieldChange={onFieldChange}
        />

        {/* Order History */}
        {companyId && customerId && (
          <>
            <div className="h-px bg-gray-100" />
            <CustomerOrderHistory
              companyId={companyId}
              customerId={customerId}
              currentOrderId={currentOrderId}
              onOpenOrder={onOpenOrder}
            />
          </>
        )}

        {/* Chat debug info */}
        {chatDebugInfo && (
          <div className="mt-auto pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Technical Info</h4>
            </div>
            <div className="text-[10px] font-mono text-gray-400 break-all bg-gray-50 p-2 rounded border border-gray-100">
              ID: {chatDebugInfo.id} <br />
              Chan: {chatDebugInfo.channelType}
              {chatDebugInfo.orderId && <> <br /> Order: #{chatDebugInfo.orderId}</>}
              {chatDebugInfo.username && <> <br /> Username: {chatDebugInfo.username} </>}
              {chatDebugInfo.phone && <> <br /> Phone (Meta): {chatDebugInfo.phone} </>}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
