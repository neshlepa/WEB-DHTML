package com.planfood.backend.dto;

import com.planfood.backend.entity.InteractionType;
import lombok.Data;

// дто для приема свайпов (реакции на блюдо)

@Data
public class ReactionRequestDto {
    private InteractionType reaction; // Используем Enum  (лайк, дизлайк, избранное)
}