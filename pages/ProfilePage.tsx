
import React, { useState, useEffect } from 'react';
import {
    User as UserIcon,
    Mail,
    Shield,
    LogOut,
    Camera,
    Save,
    Loader2,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { usersService } from '../services';
import type { User } from '../types/api';
import { useAsync } from '../hooks/useAsync';
import { logger } from '../utils/logger';

export const ProfilePage: React.FC = () => {
    const { data: user, isLoading, error: fetchError, refetch: fetchProfile } = useAsync(
        () => usersService.getMe(),
        [],
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setIsSaving(true);
            setError(null);
            setSuccess(false);

            await usersService.updateProfile({
                first_name: firstName,
                last_name: lastName
            });

            fetchProfile();
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            logger.error('Failed to update profile', err);
            setError('Не удалось обновить профиль');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
                        <p className="text-gray-500 text-sm">Управление личными данными и настройками аккаунта</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 border border-red-100 bg-white text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-all shadow-sm"
                    >
                        <LogOut size={16} />
                        Выйти
                    </button>
                </div>

                {(error || fetchError) && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={18} />
                        {error || 'Не удалось загрузить данные профиля'}
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={18} />
                        Профиль успешно обновлен
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-8">
                        <form onSubmit={handleUpdateProfile} className="space-y-8">

                            {/* Avatar Section */}
                            <div className="flex flex-col items-center sm:flex-row gap-6">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100 flex items-center justify-center">
                                        {/* In a real app, this would be user.avatarUrl */}
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=6366f1&color=fff&size=128`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera size={24} className="text-white" />
                                    </div>
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="text-lg font-bold text-gray-900">{firstName} {lastName}</h3>
                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                    <button type="button" className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                                        Изменить фотографию
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-1.5">
                                    <label className="form-label pl-1">Имя</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserIcon size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all font-medium"
                                            placeholder="Имя"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="form-label pl-1">Фамилия</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <UserIcon size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all font-medium"
                                            placeholder="Фамилия"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="form-label pl-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail size={16} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed select-none font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="form-label pl-1">Роль в системе</label>
                                    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl w-full">
                                        <Shield size={16} className="text-gray-400" />
                                        <span className="text-sm font-semibold text-gray-600 uppercase tracking-tight">
                                            {user?.is_superuser ? 'Super Administrator' : (user?.role || 'Manager')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Сохранить изменения
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Info Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Безопасность</h4>
                        <p className="text-xs text-gray-500 mb-4">Ваш пароль был изменен 3 месяца назад. Рекомендуем обновлять пароль раз в полгода.</p>
                        <button className="text-xs font-bold text-indigo-600 hover:underline">Изменить пароль</button>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-900 mb-2">Сессии</h4>
                        <p className="text-xs text-gray-500 mb-4">На данный момент у вас 2 активные сессии на различных устройствах.</p>
                        <button className="text-xs font-bold text-indigo-600 hover:underline">Управление сессиями</button>
                    </div>
                </div>

            </div>
        </div>
    );
};
