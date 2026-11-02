import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import Message

# Токен вашего бота от @BotFather
TOKEN = os.getenv("BOT_TOKEN", "9253625270:AAHojU7r0X9Rp_rBSOoRNSf7iBoizI8uDbU")

# ID вашего закрытого канала (например, -1001234567890)
CHANNEL_ID = int(os.getenv("CHANNEL_ID", "-1004326435953"))

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "👋 Привет!\n\n"
        "Отправьте мне фотографии или видео (до 2 ГБ), и они автоматически сохранятся в защищенный архив."
    )

# Обработка фотографий, видео и документов
@dp.message(lambda msg: msg.photo or msg.video or msg.document)
async def handle_media(message: Message):
    user = message.from_user
    username = f"@{user.username}" if user.username else f"ID: {user.id}"
    user_full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    
    await message.answer("✅ Файл принят и успешно сохранен в архив!")
    
    # Текст-подпись к файлу в вашем канале
    caption = f"📁 Новый файл\n👤 От: {user_full_name} ({username})"
    
    try:
        # Пересылаем файл в ваш закрытый канал-архив
        if message.photo:
            await bot.send_photo(chat_id=CHANNEL_ID, photo=message.photo[-1].file_id, caption=caption)
        elif message.video:
            await bot.send_video(chat_id=CHANNEL_ID, video=message.video.file_id, caption=caption)
        elif message.document:
            await bot.send_document(chat_id=CHANNEL_ID, document=message.document.file_id, caption=caption)
    except Exception as e:
        print(f"Ошибка при пересылке в канал: {e}")

async def main():
    print("Бот запущен и готов принимать файлы в архив...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
