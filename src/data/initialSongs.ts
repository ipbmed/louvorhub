import { Song } from '../types';

export const INITIAL_SONGS: Song[] = [
  {
    id: 'Song-1',
    songType: 'hino',
    hymnal: 'Novo Cântico',
    number: 1,
    title: 'Grandioso És Tu',
    subtitle: 'O Senhor Meu Deus',
    category: 'Adoração e Louvor',
    originalKey: 'A',
    timeSignature: '4/4',
    author: 'Carl Boberg',
    composer: 'Melodia Tradicional Sueca',
    tags: ['Criação', 'Exaltação', 'Majestade'],
    youtubeUrl: 'https://www.youtube.com/watch?v=R9j663K36pI',
    spotifyUrl: 'https://open.spotify.com/search/Grandioso%20Es%20Tu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[A] Senhor meu Deus, quando eu [D] maravilhado
Fico a [A] pensar nas [E7] obras de tuas [A] mãos,
O céu azul de [D] estrelas pontilhado,
O teu po[A]der mos[E7]trando na cria[A]ção:

[REFRÃO]
Então mi[A]nh'alma [D] canta a ti, Se[A]nhor:
"Grandioso [Bm] és [E7] Tu! Grandioso [A] és Tu!"
Então mi[A]nh'alma [D] canta a ti, Se[A]nhor:
"Grandioso [Bm] és [E7] Tu! Grandioso [A] és Tu!"

Quando a vagar nas [D] matas e bosques
Ouso dos [A] pássaros o [E7] alegre can[A]tar,
Olhando os montes, [D] vales e campinas,
E sinto a [A] aragem [E7] fresca a me to[A]car:

Quando eu medito em [D] teu amor tão grande,
Que teu Fi[A]lho deu pra [E7] me sal[A]var,
Na cruz vertendo [D] seu precioso sangue,
Minha al[A]ma livre [E7] para te lou[A]var:`
  },
  {
    id: 'Song-2',
    songType: 'hino',
    hymnal: 'Cantor Cristão',
    number: 15,
    title: 'Rude Cruz',
    subtitle: 'A Mensagem da Cruz',
    category: 'Ceia do Senhor',
    originalKey: 'G',
    timeSignature: '6/8',
    author: 'George Bennard',
    composer: 'George Bennard',
    tags: ['Cruz', 'Gólgota', 'Sacrifício', 'Ceia'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[G] Num monte a[G7] lonjura se [C] ergue a rude cruz,
Em[G]blema de [D7] vergonha e [G] dor;
Mas eu amo essa [G7] cruz onde [C] morreu Jesus,
Por [G] mim, um pe[D7]cador a[G]mor.

[REFRÃO]
Sim, eu [D7] amo a mensagem da [G] cruz,
'Té mo[C]rer eu a vou procla[G]mar;
Levan[G]tarei eu a [G7] minha cruz [C] junto a Jesus,
E por [G] uma co[D7]roa a tro[G]car.`
  },
  {
    id: 'Song-3',
    songType: 'hino',
    hymnal: 'Novo Cântico',
    number: 3,
    title: 'Castelo Forte',
    subtitle: 'Ein feste Burg ist unser Gott',
    category: 'Fidelidade e Confiança',
    originalKey: 'D',
    timeSignature: '4/4',
    author: 'Martinho Lutero',
    composer: 'Martinho Lutero',
    tags: ['Reforma', 'Proteção', 'Vitória', 'Fé'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[D] Castelo [Bm] forte é o [A] nosso [D] Deus,
Es[G]pada e [D] escu[A]do ver[D]dadeiro;
Ele [D] nos livra dos [Bm] males [A] seus
Que [G] nos cer[D]cam no [A] mundo in[D]teiro.`
  },
  {
    id: 'Song-4',
    songType: 'hino',
    hymnal: 'Harpa Cristã',
    number: 116,
    title: 'Alvo Mais Que a Neve',
    subtitle: 'Bendito Seja o Cordeiro',
    category: 'Salvação e Graça',
    originalKey: 'E',
    timeSignature: '3/4',
    author: 'Eden R. Latta',
    composer: 'Henry S. Perkins',
    tags: ['Purificação', 'Sangue de Jesus', 'Perdão'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[E] Bendito seja o Cordeiro
Que na [B7] cruz por nós morreu!
Bendito [E] seja o seu sangue,
Que por [B7] nós ali ver[E]teu!

[REFRÃO]
[E] Alvo mais que a [B7] neve!
Alvo mais que a [E] neve!
Sim, nesse [A] sangue lavado,
Meu [E] ser fi[B7]cará mais que a [E] neve!`
  },
  {
    id: 'Song-5',
    songType: 'hino',
    hymnal: 'Novo Cântico',
    number: 15,
    title: 'Tu És Fiel, Senhor',
    subtitle: 'Great Is Thy Faithfulness',
    category: 'Fidelidade e Confiança',
    originalKey: 'C',
    timeSignature: '3/4',
    author: 'Thomas O. Chisholm',
    composer: 'William M. Runyan',
    tags: ['Provisão', 'Misericórdia', 'Fidelidade'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[C] Tu és fiel, Se[F]nhor, ó Deus [G7] meu Pai!
[C] Nunca fal[F]tou tua [C] miseri[D7]córdia em [G] mim.

[REFRÃO]
[G] Tu és fi[C]el, Senhor! [A7] Tu és fi[Dm]el, Senhor!`
  },
  {
    id: 'cantico-1',
    songType: 'cantico',
    title: 'Ao Único Que É Digno',
    subtitle: 'Com Minha Voz Cantarei',
    category: 'Adoração e Louvor',
    originalKey: 'C',
    timeSignature: '4/4',
    author: 'Benedito Carlos',
    composer: 'Benedito Carlos',
    tags: ['Aclamação', 'Cântico', 'Soberania'],
    youtubeUrl: 'https://www.youtube.com/watch?v=7M7o3yW6c-o',
    spotifyUrl: 'https://open.spotify.com/search/Ao%20Unico%20que%20e%20digno',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[C] Ao Único que é [Em] digno de re[F]ceber [G]
A [C] honra e a glória, a [Em] força e o po[F]der. [G]
Ao [F] Rei eterno e i[G]mortal, in[Em]visível, mas [Am] real,
A [Dm] Ele ministramos [G] o lou[C]vor!

[REFRÃO]
[F] Coro[G]amos a [C] Ti, ó Rei Je[Am]sus!
[F] Coro[G]amos a [C] Ti, ó Rei Je[Am]sus!`
  },
  {
    id: 'cantico-2',
    songType: 'cantico',
    title: 'Porque Ele Vive',
    subtitle: 'Deus Enviou Seu Filho',
    category: 'Ressurreição e Esperança',
    originalKey: 'G',
    timeSignature: '4/4',
    author: 'Gloria & William J. Gaither',
    composer: 'William J. Gaither',
    tags: ['Vitória', 'Cântico', 'Ressurreição'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[G] Deus enviou seu [G7] Filho a[C]mado
Para [G] morrer em meu lu[D7]gar;
Na [G] cruz morreu, pa[G7]gou os meus pe[C]cados,
Mas o tu[G]mulo vazio es[D7]tá pra compro[G]var.

[REFRÃO]
Porque Ele [G] vive, [G7] eu posso crer no a[C]manhã;
Porque Ele [G] vive, [Em] temor não [Am] há. [D7]`
  },
  {
    id: 'cantico-3',
    songType: 'cantico',
    title: 'Vem, Esta é a Hora',
    subtitle: 'Come, Now Is the Time to Worship',
    category: 'Adoração e Louvor',
    originalKey: 'D',
    timeSignature: '4/4',
    author: 'Brian Doerksen',
    composer: 'Brian Doerksen',
    tags: ['Invocação', 'Abertura', 'Celebração', 'Cântico'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[D] Vem, esta é a hora da a[G]dora[D]ção!
[A] Vem, dar a Ele o teu co[Em]ra[G]ção!
[D] Vem, assim como estás para a[G]dora[D]ção!

[CORO]
[G] Toda língua confessa[D]rá que és Senhor!
[G] Todo joelho se dobra[D]rá!`
  },
  {
    id: 'cantico-4',
    songType: 'cantico',
    title: 'Aclame ao Senhor',
    subtitle: 'My Jesus, My Saviour',
    category: 'Adoração e Louvor',
    originalKey: 'A',
    timeSignature: '4/4',
    author: 'Darlene Zschech',
    composer: 'Hillsong Worship',
    tags: ['Aclamação', 'Exaltação', 'Cântico'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[A] Meu Jesus, [E] Salvador, [F#m] outro não [E] há como [D] Tu.
Todos os [A/C#] dias [D] quero lou[A/E]var as mervilhas [F#m] de teu [G] a[D/F#]mor. [E]

[REFRÃO]
[A] Aclame ao Se[F#m]nhor toda a [D] terra e can[E]temos,
[A] Poder, majes[F#m]tade e lou[D]vores ao [E] Rei!
[F#m] Montes se prostrem e o [D] mar rugirá
Ao [E] som do teu [F#m] nome! [E]`
  },
  {
    id: 'cantico-5',
    songType: 'cantico',
    title: 'Quão Grande É o Meu Deus',
    subtitle: 'How Great Is Our God',
    category: 'Adoração e Louvor',
    originalKey: 'C',
    timeSignature: '4/4',
    author: 'Chris Tomlin',
    composer: 'Chris Tomlin',
    tags: ['Majestade', 'Grandeza', 'Cântico'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lyrics: `[C] O Rei está vestido em [Am7] majestade e luz
Faça a terra se [F2] alegrar, faça a terra se alegrar.

[REFRÃO]
[C] Quão grande é o meu Deus! Cantarei [Am7] quão grande é o meu Deus!
E todos hão de [F] ver quão grande, [G] quão grande é o meu [C] Deus!`
  }
];
