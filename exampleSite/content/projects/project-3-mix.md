---
title: "Angels in Amplifiers Mix"
number: "03"
weight: 3
week: 8
assigned: "2025-10-15"
due: "2025-10-24"
summary: "Complete a multitrack mix using EQ, compression, delay, and reverb. Critical listening and technical mixing."
tools: ["REAPER", "ReaEQ", "ReaComp"]
# this project carries its own rubric table in the body
rubric: false
---
 
We'll use all we have learned so far about mixing to create a rough mix of Angels In Amplifiers song _I'm Alright_. You can download the project files [here](https://mtkdata.cambridgemusictechnology.co.uk/MTK006/AngelsInAmplifiers_ImAlright.zip). Click [here](https://previews.cambridge-mt.com/ImAlright_Preview.mp3) to listen to a mixed version of this song. The engineer is using some techniques that we haven't learned yet, but the mix does show good use of balance, equalization, compression, and reverb. 

You'll follow the steps below to complete your own mix for this song. 

- Every track should use a ReaEQ
- at least two tracks should use ReaComp
- use three delays with different settings as sends
- use at least two reverbs with different settings as sends 

## Organization

**1. Set Your Project Tempo to 96 BPM:** 
   - Locate the tempo settings in the bottom right-hand corner of Reaper.
   - Change the tempo to 96 beats per minute (BPM). This helps you align recordings accurately with your project timeline.

**2. Order Your Tracks Numerically:**
   - Start with `01_Kick` and continue from there. 

**3. Group the Tracks by Type:**
   - Create three groups for your tracks: "Drums," "Chords," and "Vocals."
   - To assign tracks to these groups, simply drag and drop them into the appropriate group.

**4. Color-Code Each Group:**
   - Assign a unique color to each of the three groups: one color for "Drums," another for "Chords," and a third for "Vocals."

## Build a mix

> Tip: to get more fine-grained control over parameters press command (control) + drag.

**1. Initialize the Mix:**
   - Start with all faders set to "-inf dB" (infinity decibels), which effectively mutes all tracks.

**2. Set Time Selection and Repeat:**
   - Set your time selection to cover the entire duration from the start to the end of measure 8 in your project.
   - Enable the "toggle repeat" function (looping) for this time selection. This ensures that the same section will play repeatedly as you work on it.

**3. Determine Element Order:**
   - Decide the order of importance for bringing in elements. Commonly, you might start with foundational elements like drums or bass and gradually introduce other instruments, vocals, or effects. The choice depends on your specific project and musical style.

**4. Bring in Elements:**
   - Gradually increase the fader levels for each element according to the order of importance you decided in step 3.
   - As you bring in each element, keep an eye on the meters in your software to ensure that you're not clipping. Ideally, aim to peak at around -3 to -6 dB to leave headroom for additional processing and prevent distortion.

**5. Monitor and Adjust Levels:**
   - Continuously monitor the meters as you add more elements to the mix.
   - If you notice any tracks peaking above your target range of -3 to -6 dB, reduce their levels using their respective faders. This helps prevent clipping and maintains a balanced mix.

## Equalization

**1. Apply High-Pass Filters:**
   - Start with all tracks playing in your mix.
   - Identify instruments with low-frequency content that might contribute to low-frequency buildup. These are typically instruments like bass, kick drum, and potentially some piano or guitar tracks.
   - For each of these instruments, apply a high pass filter to remove unwanted low frequencies. Here's how to do it:
     - Select the track or channel of the instrument in Reaper.
     - Open a ReaEQ plugin or channel strip for that track.
     - Locate the high-pass filter option.
     - Set the filter frequency to a point where it removes unnecessary low frequencies without affecting the instrument's tone negatively. A common starting point is around 20-40 Hz for most instruments.

**2. Listen for Masking:**
   - Play your mix and listen carefully for any instances where instruments might be masking each other. Masking occurs when two or more instruments occupy the same frequency range, making it hard to distinguish them in the mix.

**3. Identify Masking Pairs:**
   - Specifically, pay attention to the following areas:
     - Guitar vs. Piano
     - Kick Drum vs. Bass Guitar
     - Vocals vs. Other Instruments

**4. Address Masking with EQ:**
   - Once you've identified masking, select the instrument that you want to reduce the frequencies of.
   - Open the EQ plugin for that instrument's track.
   - Find the frequency range where masking is occurring. You can do this by sweeping an EQ band's frequency control while listening for the most problematic frequencies.
   - Reduce the volume of the problematic frequencies in one of the instruments by lowering the corresponding EQ band. This carves out space for the other instrument in the mix.
   - Repeat this process for any other masking pairs you've identified.

**5. Continuously Listen and Adjust:**
   - As you make these EQ adjustments, continuously listen to the mix to ensure that you're achieving better separation and clarity between instruments.
   - Make fine-tuned adjustments as needed to strike the right balance between instruments and minimize masking.

## Compression

**1. Listen for Inconsistent Elements:**
   - Play your mix and listen attentively for any elements that appear to stick out of the mix inconsistently. These might be instruments or vocals that sometimes become too prominent.

**2. Listen for Elements Getting Drowned Out:**
   - Similarly, identify elements that seem to get drowned out or buried in the mix at certain points. These are the elements that may benefit from compression to maintain a more consistent presence.

**3. Identify Compression Candidates:**
   - Based on your observations, determine which elements in your mix require compression. Good candidates include:
     - Vocals
     - Drum Folder (e.g., a group of drums) - Consider using a compressor like the 1175.
     - Drum Overheads - Also consider using a compressor like the 1175.
     - Bass Guitar

**4. Apply Compression:**
   - Start by selecting one of the identified elements that require compression (e.g., vocals).
   - Insert a ReaComp on the track for that element.

**5. Configure the Compressor:**
   - Adjust the compressor's settings to control the dynamics of the element. 
     - Threshold: Set the level at which compression begins. Adjust it to catch the dynamic variations you want to control.
     - Ratio: Determine how much compression is applied once the signal exceeds the threshold. Start with a moderate ratio and adjust as needed.
     - Makeup Gain: Compensate for the reduction in volume caused by compression by increasing the output gain. With ReaComp the makeup gain is controlled with the Wet slider. 

**6. Listen and Fine-Tune:**
   - Play your mix and listen to the impact of the compression on the selected element.
   - Make adjustments to the compressor's settings as necessary to achieve a more consistent level for that element throughout the mix.
   - Repeat this process for other elements you've identified as compression candidates.

**7. A/B Testing:**
   - Always use A/B testing to compare the compressed and uncompressed versions of the track. Ensure that compression enhances the element's consistency without introducing unwanted artifacts.

## Delay

- Add three delay sends with three different lengths of delays
- try them on different instruments with different amounts, use your ears. You can do this by routing the dry signal of a track to the send with the delay on it. 
- Delays on vocals can make them sound bigger without pushing them back in the mix
- Delays on chord instruments can sound great as well. Try using rhythmic delays to get an interesting movement to your mix.

**1. Add Three Delay Sends with Different Lengths:**
   - Create three separate tracks to act as your delay sends. Label them accordingly for clarity.

**2. Set Up Different Delay Lengths:**
   - On each of the delay aux tracks, insert a delay plugin.
   - Configure the settings of each delay plugin to have distinct delay lengths, measured in milliseconds:
     - Delay 1: Short delay (e.g., 1-50ms)
     - Delay 2: Medium delay (e.g., 50-400ms)
     - Delay 3: Long delay (e.g., 500-800ms)

**3. Route Dry Signal to Delay Sends:**
   - Choose the track or tracks that you want to apply delay to (e.g., vocals and chord instruments).
   - Click on the route button then drag while clicking onto the delay send you want to use. 
   - Adjust the send level to control the amount of signal sent to the delay. Start with a moderate level.
   - Note: a single track will probably only go to one delay send, but each delay send will have multiple tracks sent to it. 

**4. Idea 1: Apply Delays to Vocals:**
   - On your vocal track(s), use one of the delay sends you've created (e.g., Short Delay).
   - Play back your mix and listen to how the delay affects the vocals. Delays on vocals can create a sense of spaciousness without pushing them too far back in the mix.
   - Adjust the send level on the vocal track and fine-tune the delay settings until you achieve the desired effect. Trust your ears during this process.

**5. Idea 2: Apply Delays to Chord Instruments:**
   - On your chord instrument track(s), use another one of the delay sends (e.g., Medium Delay or Long Delay).
   - Experiment with different delay lengths to achieve unique effects, such as rhythmic delays that add movement to your mix.
   - Adjust the send level and delay settings on each chord instrument track to create an interesting and balanced sonic texture.

**6. Listen and Refine:**
   - Play back your mix in Reaper and carefully listen to how the delays interact with the vocals and chord instruments.
   - Make any necessary adjustments to the send levels, delay lengths, or feedback settings to achieve the desired sonic character while maintaining a well-balanced mix.


## Reverb

- Try reverb on instruments that you want to sound like are coming from the same space.
- Reverbs can also be used to make an instrument sound large. Be careful, as this can often push the instrument back in the mix.
- Use at least two reverb sends. 
- Follow the same guidelines to setup the sends as with the delay effects. 

### Mixing Project Rubric 

| Criteria               | Exceeds Expectations (4 pts)                                                                    | Meets Expectations (3 pts)                                | Needs Improvement (2 pts)                                           | Incomplete (0-1 pt)                 |
| ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| **Organization**       | Followed all steps to organize session including tempo, track order, grouping, and color coding | Followed most organization steps with minor errors        | Attempted some organization but multiple steps missing or incorrect | Little or no organization completed |
| **Balance and Levels** | Excellent use of faders to establish balanced foundation                                        | Good use of faders to balance most elements appropriately | Inconsistent balance with some elements too loud or quiet           | No attempt made to balance elements |
| **Equalization**       | Applied effective EQ to remove low frequencies and address masking across multiple tracks       | Adequate use of EQ on some tracks to control frequencies  | Limited or ineffective EQ usage                                     | No EQ used                          |
| **Compression**        | Used compression appropriately on 2+ tracks to control dynamics and consistency                 | Compressed 1 track in a functional way                    | Compression used incorrectly or on wrong tracks                     | No compression used                 |
| **Delay**              | Created 3 unique delay sends, applied creatively to enhance mix                                 | Created 2-3 delay sends and used adequately               | Only 1 delay send created or used ineffectively                     | No delay sends created              |
| **Reverb**             | Created 2+ sends, used reverb effectively to blend elements                                     | Created 1-2 reverbs and used reasonably well              | Reverb used incorrectly or on inappropriate tracks                  | No reverb used                      |
| **Overall Mix**        | Balanced, clear mix using effects to create professional polish                                 | Mostly balanced mix with good use of some tools           | Mix needs significant improvements in balance and use of tools      | Unbalanced mix with no effects used |
