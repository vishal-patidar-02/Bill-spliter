'use client';

import { useState } from 'react';
import { Trash2, UserPlus, Crown } from 'lucide-react';
import { Member } from '@/lib/types';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { useSessionStore } from '@/lib/store';
import { useToast } from './Toast';

interface MembersCardProps {
  sessionId: string;
  members: Member[];
}

export default function MembersCard({ sessionId, members }: MembersCardProps) {
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const { addMember, removeMember } = useSessionStore();
  const { showToast } = useToast();

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      showToast('Name already exists', 'warning');
      return;
    }
    addMember(sessionId, name);
    setNewName('');
    setShowInput(false);
    showToast(`${name} joined! 🎉`);
  };

  const handleRemove = (member: Member) => {
    removeMember(sessionId, member.id);
    showToast(`${member.name} removed`);
  };

  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-bold text-slate-800 flex items-center gap-2">
          <span className="text-lg">👥</span> Members
          <span className="badge badge-neutral bg-slate-100">{members.length}</span>
        </h3>
        <button
          onClick={() => setShowInput(!showInput)}
          className="btn-ghost flex items-center gap-1 text-sky-600 text-sm font-semibold px-2 py-1 hover:bg-sky-50"
        >
          <UserPlus size={16} /> Add
        </button>
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3 animate-scale-in">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter name..."
            className="input flex-1 h-10 text-sm"
            autoFocus
            id="new-member-name"
          />
          <button onClick={handleAdd} className="btn-primary h-10 px-4 text-sm">
            Add
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {members.map((member, i) => (
          <div
            key={member.id}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all hover:shadow-sm"
          >
            <div className={cn('avatar w-7 h-7 text-xs shadow-sm', getAvatarColor(i))}>
              {getInitials(member.name)}
            </div>
            <span className="text-sm font-medium text-slate-700">{member.name}</span>
            {i === 0 && <Crown size={12} className="text-amber-500" />}
            <button
              onClick={() => handleRemove(member)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 ml-1"
              title="Remove member"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          Add members to get started 🚀
        </p>
      )}
    </div>
  );
}
