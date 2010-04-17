require 'imagine_breaker'

class Glitch < ImagineBreaker
  def break!
    (rand(5) + 1).times do
      position = rand(@file_data.size)
      @file_data[position] = ~ @file_data[position]
    end
  end
end

