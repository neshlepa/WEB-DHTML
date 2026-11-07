package com.planfood.backend.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.planfood.backend.dto.MealPlanCellDto;
import com.planfood.backend.dto.ShoppingListDto;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PdfExportService {

    // Шрифт с поддержкой кириллицы (иначе русские буквы не отобразятся)
    private Font getRussianFont(int size, int style) {
        try {
            // Читаем arial.ttf из подпапки src/main/resources/fonts
            ClassPathResource fontResource = new ClassPathResource("fonts/arial.ttf");
            try (InputStream is = fontResource.getInputStream()) {
                byte[] fontBytes = is.readAllBytes();
                // фабричный метод OpenPDF, конструирующий низкоуровневый PDF-шрифт из массива байтов
                // BaseFont.IDENTITY_H — двухбайтовая кодировка Unicode
                // BaseFont.EMBEDDED — флаг внедрения (одинаково откроется на любом устройстве)
                // true — кешировать ли разобранные данные шрифта для повторого использования
                BaseFont bf = BaseFont.createFont("arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, fontBytes, null);
                // Оборачивает базовый низкоуровневый BaseFont в высокоуровневый объект Font
                return new Font(bf, size, style);
            }
        } catch (Exception e) {
            // если не удалось найти шрифт, то вернем из стандартного шрифта (не кириллица)
            return FontFactory.getFont(FontFactory.HELVETICA, size, style);
        }
    }

    // Метод генерации PDF для Плана питания
    public byte[] generateMealPlanPdf(List<MealPlanCellDto> planCells) throws DocumentException, IOException {
        Document document = new Document(PageSize.A4); // пустой виртуальный документ формата а4
        ByteArrayOutputStream out = new ByteArrayOutputStream(); // буфер, куда запишется пдф
        PdfWriter.getInstance(document, out); // связываем документ и буфер (все что в документ добавим запишется в буфер)

        document.open();

        // Заголовок
        Font titleFont = getRussianFont(18, Font.BOLD); // создаем крупный жирный шрифт 18-го кегля
        Paragraph title = new Paragraph("План Питания", titleFont); // блок текста с собственным абзацем
        title.setAlignment(Element.ALIGN_CENTER); // выравниваем заголовок по центру
        title.setSpacingAfter(20); // добавляем отступ вниз на 20 пунктов
        document.add(title);

        // Группируем ячейки по номеру дня, чтобы выводить их блоками
        Map<Integer, List<MealPlanCellDto>> groupedByDay = planCells.stream()
                .collect(Collectors.groupingBy(MealPlanCellDto::getDayNumber));

        Font dayFont = getRussianFont(14, Font.BOLD);
        Font textFont = getRussianFont(12, Font.NORMAL);

        // Проходим по каждому дню
        for (Map.Entry<Integer, List<MealPlanCellDto>> entry : groupedByDay.entrySet()) {
            Integer day = entry.getKey();
            List<MealPlanCellDto> mealsForDay = entry.getValue();

            // Заголовок дня
            Paragraph dayTitle = new Paragraph("День " + day, dayFont);
            dayTitle.setSpacingBefore(15);
            dayTitle.setSpacingAfter(10);
            document.add(dayTitle);

            // Таблица для приемов пищи этого дня (2 колонки: Тип приема, Блюдо)
            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100); // растягиваем таблицу на 100% ширины листа
            table.setWidths(new float[]{1.5f, 3f}); // пропорции колонок

            for (MealPlanCellDto cell : mealsForDay) {
                // Переводим ENUM в красивый русский текст
                String mealTypeName = translateMealType(cell.getMealType().name());

                PdfPCell typeCell = new PdfPCell(new Phrase(mealTypeName, textFont)); // создаем ячейку таблицы
                typeCell.setPadding(8); // внутренний отступ текста от границ ячейки
                typeCell.setBackgroundColor(new Color(240, 240, 240)); // Светло-серый фон

                PdfPCell recipeCell = new PdfPCell(new Phrase(cell.getRecipe().getName(), textFont));
                recipeCell.setPadding(8);

                table.addCell(typeCell); // добавляем ячейки попарно (слева — прием пищи, справа — блюдо)
                table.addCell(recipeCell);
            }
            document.add(table);
        }

        document.close();
        return out.toByteArray();
    }

    // Метод генерации PDF для Списка покупок
    public byte[] generateShoppingListPdf(ShoppingListDto shoppingList) throws DocumentException, IOException {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        Font titleFont = getRussianFont(18, Font.BOLD);
        Paragraph title = new Paragraph("Список Покупок", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        title.setSpacingAfter(20);
        document.add(title);

        // Таблица покупок (3 колонки: Название, Вес, Цена)
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3f, 1f, 1f});

        Font headerFont = getRussianFont(12, Font.BOLD);
        Font textFont = getRussianFont(12, Font.NORMAL);

        // Шапка таблицы
        addTableHeaderCell(table, "Продукт", headerFont);
        addTableHeaderCell(table, "Вес (г)", headerFont);
        addTableHeaderCell(table, "Цена (руб)", headerFont);

        // Строки с продуктами
        for (ShoppingListDto.ShoppingItemDto item : shoppingList.getItems()) {
            table.addCell(new Phrase(item.getIngredientName(), textFont));
            table.addCell(new Phrase(String.valueOf(item.getTotalGrams()), textFont));
            table.addCell(new Phrase(String.valueOf(item.getEstimatedPrice()), textFont));
        }

        document.add(table);

        // Итоговая сумма внизу
        Paragraph total = new Paragraph("Итого: " + shoppingList.getTotalPrice() + " руб.", titleFont);
        total.setAlignment(Element.ALIGN_RIGHT);
        total.setSpacingBefore(20);
        document.add(total);

        document.close();
        return out.toByteArray();
    }

    // Вспомогательный метод для шапки таблицы
    private void addTableHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(200, 200, 200));
        cell.setPadding(8);
        table.addCell(cell);
    }

    // Вспомогательный метод для перевода MealType
    private String translateMealType(String mealType) {
        switch (mealType) {
            case "BREAKFAST": return "Завтрак";
            case "LUNCH": return "Обед";
            case "SNACK": return "Перекус";
            case "DINNER": return "Ужин";
            default: return mealType;
        }
    }
}