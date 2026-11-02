import os
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import Message

# Токен вашего бота, полученный от @BotFather
TOKEN = os.getenv("BOT_TOKEN", "9253625270:AAHojU7r0X9Rp_rBSOoRNSf7iBoizI8uDbU")

# ID администратора (ваш Telegram ID), куда будут пересылаться файлы
# Узнать свой ID можно у ботов вроде @userinfobot
ADMIN_ID = int(os.getenv("ADMIN_ID", "6324502848"))

bot = Bot(token=TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def cmd_start(message: Message):
    await message.answer(
        "👋 Привет!\n\n"
        "Отправьте мне фотографии или видео, и они мгновенно поступят владельцу проекта."
    )

# Обработка фотографий, видео и обычных файлов
@dp.message(lambda msg: msg.photo or msg.video or msg.document)
async def handle_media(message: Message):
    user = message.from_user
    username = f"@{user.username}" if user.username else f"ID: {user.id}"
    
    await message.answer("✅ Спасибо! Ваш файл успешно принят и отправлен администратору.")
    
    # Пересылаем файл вам (администратору) с информацией о пользователе
    caption = f"📁 Новый файл от пользователя: {username} ({user.first_name or ''})"
    
    if message.photo:
        # Берем фото максимального качества
        photo = message.photo[-1].file_id
        await bot.send_photo(chat_id=ADMIN_ID, photo=photo, caption=caption)
    elif message.video:
        video = message.video.file_id
        await bot.send_video(chat_id=ADMIN_ID, video=video, caption=caption)
    elif message.document:
        document = message.document.file_id
        await bot.send_document(chat_id=ADMIN_ID, document=document, caption=caption)

async def main():
    print("Бот запущен и ожидает файлы...")
    await dp.start_polling(bot)

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
