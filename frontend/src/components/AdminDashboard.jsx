import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Trash2, Shield, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../i18n/LanguageContext';

const AdminDashboard = ({ user }) => {
  const { t } = useLanguage();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (id, name) => {
    if (window.confirm(t('admin.deleteConfirm', { name }))) {
      try {
        await axios.delete(`/api/admin/users/${id}`);
        setUsersList(usersList.filter(u => u.id !== id));
      } catch (err) {
        alert(t('admin.deleteFailed'));
      }
    }
  };

  const handleToggleRole = async (id, currentAdminStatus) => {
    try {
      const newStatus = !currentAdminStatus;
      await axios.put(`/api/admin/users/${id}/role`, { is_admin: newStatus });
      setUsersList(usersList.map(u => u.id === id ? { ...u, is_admin: newStatus } : u));
    } catch (err) {
      alert(t('admin.roleUpdateFailed'));
    }
  };

  if (!user || !user.is_admin) {
    return (
      <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 flex items-center justify-center">
        <div className="text-center bg-white p-10 rounded-3xl shadow-xl border border-red-100 max-w-md">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-stone-900 mb-2">{t('admin.denied')}</h2>
          <p className="text-stone-500 font-medium">{t('admin.noAccess')}</p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => 
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pt-24 min-h-screen bg-[#fafaf9] px-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-4 opacity-60">
              <Shield size={16} className="text-[#84cc16]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#0c0a09]">{t('admin.command')}</span>
            </div>
            <h1 className="font-serif text-5xl font-black text-[#0c0a09] mb-2">{t('admin.title')}</h1>
            <p className="text-stone-500 font-medium">{t('admin.description')}</p>
          </div>

          <div className="flex items-center bg-white border border-stone-200 rounded-2xl p-2 shadow-sm w-full md:w-80">
            <Search size={18} className="text-stone-400 mx-2" />
            <input 
              type="text" 
              placeholder={t('admin.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#84cc16]" />
          </div>
        ) : (
          <div className="bg-white border-2 border-stone-200 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b-2 border-stone-200 text-[10px] uppercase tracking-widest font-black text-stone-500">
                    <th className="p-4 pl-6">{t('admin.user')}</th>
                    <th className="p-4">{t('admin.contact')}</th>
                    <th className="p-4">{t('admin.location')}</th>
                    <th className="p-4">{t('admin.joined')}</th>
                    <th className="p-4 text-center">{t('admin.role')}</th>
                    <th className="p-4 text-right pr-6">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${u.is_admin ? 'bg-stone-900' : 'bg-[#84cc16]'}`}>
                            {u.name ? u.name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-sm">{u.name || 'Unnamed'}</p>
                            <p className="text-[10px] text-stone-400 font-mono mt-0.5">{u.id.substring(0,13)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-stone-700">{u.email}</p>
                        <p className="text-[10px] text-stone-400">{u.phone || 'No phone'}</p>
                      </td>
                      <td className="p-4 text-sm text-stone-600 font-medium">
                        {u.state || 'Not specified'}
                      </td>
                      <td className="p-4 text-sm text-stone-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleToggleRole(u.id, u.is_admin)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors ${u.is_admin ? 'bg-stone-900 text-white border-stone-800 hover:bg-stone-800' : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'}`}
                        >
                          {u.is_admin ? t('admin.roleAdmin') : t('admin.roleUser')}
                        </button>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <button 
                          onClick={() => handleDelete(u.id, u.name)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('admin.deleteUser')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-10 text-center text-stone-400 font-medium">
                        {t('admin.noMatch')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
