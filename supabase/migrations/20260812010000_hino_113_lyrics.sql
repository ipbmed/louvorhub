-- Hino 113 (Novo Cântico): Achei um bom amigo — cifras inline alinhadas à letra
update public.songs
set
  lyrics_md = $lyrics$[C]Achei um bom amigo, [F]Jesus, o [C]Salvador
Dos [Am]milhares o [F]escolhido para [G]mim
[C]Ele é a Luz do [F]mundo, o forte [C]Mediador
Que me [Am]purifica e [G]guarda até ao [C]fim!
[F]Consolador amado, meu [C]protetor do mal
Ele [Am]pode dar [F]alívio ao meu [G]pesar
[C]Ele é a Luz do mundo, a [F]Estrela da [C]Manhã
Dos [Am]milhares, o [G]escolhido para [C]mim

[C]Levou-me as dores todas,[F] as mágoas lhe entregu[C]ei
Ne[Am]le tenho firme [F]abrigo em tenta[G]ção!
[C]Deixei por ele tudo, os [F]ídolos queim[C]ei
Ele [Am]fez-me puro e [G]santo o cora[C]ção!
Que o [F]mundo me abandone, [C]persiga o tentador
Meu [Am]Jesus me guarda [F]até da vida ao [G]fim
[C]Ele é a Luz do mundo, a [F]Estrela da [C]Manhã
Dos [Am]milhares, o [G]escolhido para [C]mim

[C]Jamais me desampara, [F]nem me abandonar[C]á
Se [Am]fiel e o[F]bediente aqui [G]viver!
[C]Está sempre a meu lado e me [F]proteger[C]á
Até quando [Am]face a [G]face o possa [C]ver!
[F]Então, aos céus subindo, na [C]glória eu me verei
Com [Am]Jesus, meu Sal[F]vador, morando, [G]enfim
[C]Ele é a Luz do mundo, a [F]Estrela da [C]Manhã
Dos [Am]milhares, o [G]escolhido para [C]mim$lyrics$,
  title = coalesce(nullif(trim(title), ''), 'Achei um bom amigo'),
  updated_at = now()
where kind = 'hino'
  and number = 113;
