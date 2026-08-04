-- Trava de banco complementar ao decremento atomico condicional
-- (decrementFieldIfSufficient, UPDATE ... WHERE stock >= quantidade) feito
-- no CheckoutOrder — mesmo que algum caminho de codigo futuro escreva um
-- valor calculado errado, o banco recusa em vez de deixar estoque negativo.
ALTER TABLE produtos
    ADD CONSTRAINT produtos_stock_non_negative CHECK (stock >= 0);
