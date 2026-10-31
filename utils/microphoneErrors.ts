function domExceptionName(error: unknown): string | undefined {
  if (error instanceof DOMException) {
    return error.name;
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const n = (error as { name: unknown }).name;
    return typeof n === 'string' ? n : undefined;
  }
  return undefined;
}

export function toastMessageForMicrophoneStartFailure(error: unknown): string {
  const name = domExceptionName(error);
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Доступ к микрофону запрещён. Разрешите доступ в настройках сайта.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Микрофон не найден.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Микрофон занят другим приложением.';
  }
  if (name === 'NotSupportedError' || name === 'SecurityError') {
    return 'Браузер не поддерживает эту схему записи. Обновите браузер или попробуйте другой.';
  }
  if (error instanceof Error) {
    if (error.message.includes('getUserMedia is not available')) {
      return 'Для записи нужен защищённый доступ (HTTPS или localhost).';
    }
    if (error.message.includes('Web Audio API not supported')) {
      return 'Браузер не поддерживает запись звука.';
    }
    if (error.message.includes('ScriptProcessorNode is not available')) {
      return 'Этот браузер не поддерживает запись голоса в MP3. Попробуйте Chrome или Firefox.';
    }
  }
  return 'Не удалось начать запись. Проверьте микрофон и настройки браузера.';
}
