import React, { useEffect, useState } from 'react';
import {
  Tag,
  Phone as PhoneIcon,
  Mail,
  Send,
  MessageCircle,
  Hash,
  MapPin,
  Edit2,
} from 'lucide-react';
import type { Customer } from '../../types/api';
import { FieldInput } from '../FieldInput';

export interface TransportMeta {
  whatsapp?: string;
  telegramId?: string;
  telegramUsername?: string;
}

interface CustomerContactsProps {
  customer: Customer;
  transportMeta?: TransportMeta;
  onSaveContact?: (name: string, phone: string) => void;
}

export const CustomerContacts: React.FC<CustomerContactsProps> = ({
  customer,
  transportMeta,
  onSaveContact,
}) => {
  const [name, setName] = useState(customer.name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(customer.name ?? '');
    setPhone(customer.phone ?? '');
    setIsEditing(false);
  }, [customer.id, customer.customer_id]);

  const editable = Boolean(onSaveContact);

  const handleBlur = () => {
    if (!onSaveContact) return;
    if (name !== (customer.name ?? '') || phone !== (customer.phone ?? '')) {
      onSaveContact(name, phone);
    }
  };

  // Resolve telegram username from customer or transport
  const tgUsername = customer.username || transportMeta?.telegramUsername;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1 group">
        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Контакты</h4>
        {editable && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-sky-500"
            title="Редактировать"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex flex-col gap-2">
          <ContactItem icon={<Tag size={14} />} label="Имя" value={name || 'Без имени'} />
          <ContactItem icon={<PhoneIcon size={14} />} label="Телефон" value={phone || '-'} />
          <ContactItem
            icon={<Mail size={14} />}
            label="Email"
            value={customer.email || '-'}
            isPlaceholder={!customer.email}
          />
          {transportMeta?.whatsapp && (
            <ContactItem
              icon={<MessageCircle size={14} className="text-green-500" />}
              label="WhatsApp"
              value={transportMeta.whatsapp}
            />
          )}
          <ContactItem
            icon={<Send size={14} className="text-sky-400" />}
            label="Telegram"
            value={tgUsername ? `@${tgUsername}` : '-'}
            isPlaceholder={!tgUsername}
          />
          {transportMeta?.telegramId && (
            <ContactItem
              icon={<Hash size={14} />}
              label="Telegram ID"
              value={transportMeta.telegramId}
            />
          )}
          {customer.location && (
            <ContactItem icon={<MapPin size={14} />} label="Локация" value={customer.location} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
          <FieldInput
            icon={<Tag size={14} />}
            label="Имя"
            value={name}
            onChange={setName}
            onBlur={handleBlur}
          />
          <FieldInput
            icon={<PhoneIcon size={14} />}
            label="Телефон"
            value={phone}
            onChange={setPhone}
            onBlur={handleBlur}
          />
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-700 px-2 py-1 bg-sky-50 rounded"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ContactItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  isPlaceholder?: boolean;
}> = ({ icon, label, value, isPlaceholder }) => (
  <div className="flex items-center gap-3 py-1 group/item">
    <div className="w-5 flex justify-center text-gray-400 group-hover/item:text-gray-600 transition-colors">
      {icon}
    </div>
    <div className="flex flex-col min-w-0">
      <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight leading-none mb-0.5">
        {label}
      </div>
      <div className={`text-[13px] truncate ${isPlaceholder ? 'text-gray-300 italic' : 'text-gray-900 font-medium'}`}>
        {value}
      </div>
    </div>
  </div>
);
