# TC-02 — Host and audience sync

**Area:** Host / audience  
**Type:** Manual

## Setup

Host URL + **Open audience board** (separate window). Same origin.

## Steps

1. On the host, **Start / random board** then **Show question**. Audience shows the prompt; slots still hidden; clock starts.
2. Reveal answer 1 on the host. Audience slot 1 fills; ding plays on the **host** PC (if sounds on).
3. Uncheck **Bring board to front on each update** and **Then return to host**, reveal another answer, then re-check them. Hop should pause then resume (board focuses ~400 ms then host returns).
4. Change Team A’s name on the host. Audience chrome uses the new name.

## Expected

Audience matches host after each persist. Mute stops ding/buzz on the host.
